import { App, ComponentPublicInstance } from 'vue'
import { Router } from 'vue-router'
import {
  BuriedPointConfig,
  BuriedPointContext,
  HookConfig,
  PageBuriedPointConfig,
  PageHookName,
  Payload
} from './type'
import _get from 'lodash/get'

enum PathFlag {
  LAST = 0,
  CURRENT = 1,
  NEXT = 2
}

function install(
  app: App,
  options: {
    config?: BuriedPointConfig
    requestConfig?: () => Promise<BuriedPointConfig>
    router: Router
    dispatchReport: (reportData: any) => void
  }
) {
  let { config, requestConfig, router, dispatchReport } = options
  if (config) {
    init(config)
  } else if (requestConfig) {
    requestConfig().then(init)
  }

  const initTriggerTime = (triggerTime: BuriedPointConfig['triggerTime']) => {}

  function init(config: BuriedPointConfig) {
    const createContext = () => {
      return {
        startTime: Date.now(),
        timers: [],
        paths: []
      } as BuriedPointContext
    }

    const vmCtx = (vm: ComponentPublicInstance): BuriedPointContext | null => {
      let instance: ComponentPublicInstance | null = vm
      while (instance && !instance.$isRouterRootComp) {
        instance = instance.$parent
      }
      return (instance && instance.$buriedPointContext) || null
    }

    const ctx = <T extends keyof BuriedPointContext>(
      vm: ComponentPublicInstance,
      key: T
    ): BuriedPointContext[T] | null => {
      const context = vmCtx(vm)
      return (context && context[key]) || null
    }

    const getHook = (
      path: string,
      HookName: PageHookName
    ): HookConfig | null => {
      const hooks = config[path] && config[path].hooks
      const hook = hooks && hooks[HookName]
      return hook || null
    }

    const getPageDataMap = (
      vm: ComponentPublicInstance,
      pageData: Payload['pageData']
    ) => {
      return (
        (pageData &&
          pageData.reduce((result, cur) => {
            return {
              ...result,
              cur: _get(vm, cur)
            }
          }, {})) ||
        null
      )
    }

    const getPageDuration = (vm: ComponentPublicInstance) => {
      const startTime = ctx(vm, 'startTime')
      return startTime ? Date.now() - startTime : 0
    }

    const compositionData = (vm: ComponentPublicInstance, payload: Payload) => {
      const { flag, pageData } = payload
      const pageDataMap = getPageDataMap(vm, pageData)
      const pageDuration = getPageDuration(vm)
      return {
        flag,
        pageDataMap,
        pageDuration,
        paths: ctx(vm, 'paths'),
        currentPagePath: vm.$route.path
      }
    }

    const initTriggerTime = (
      vm: ComponentPublicInstance,
      context: BuriedPointContext,
      triggerTime: PageBuriedPointConfig['triggerTime']
    ) => {
      if (!triggerTime) return
      context.timers = []
      triggerTime.forEach((item) => {
        context.timers.push(
          setTimeout(() => {
            dispatchReport(compositionData(vm, item.payload))
          }, item.time)
        )
      })
    }

    const initTriggerElements = (
      vm: ComponentPublicInstance,
      context: BuriedPointContext,
      triggerElements: PageBuriedPointConfig['triggerElements']
    ) => {
      if (!triggerElements) return
      const $el = vm.$el as Element
      if (!$el) return
      const selectorFn = (
        selector: string,
        once: boolean | undefined,
        findAll: boolean
      ) => {
        let els
        if (findAll) {
          els = Array.from($el.querySelectorAll(selector))
        } else {
          els = [$el.querySelector(selector)]
        }
      }
      triggerElements.forEach((item) => {
        const els = selectorFn(item.selector, !!item.once, item.findAll)
      })
    }

    const initTriggerState = (
      vm: ComponentPublicInstance,
      context: BuriedPointContext,
      triggerState: PageBuriedPointConfig['triggerState']
    ) => {}

    const createInitTriggerInvoker = (
      vm: ComponentPublicInstance,
      context: BuriedPointContext,
      pageConfig: PageBuriedPointConfig
    ) => {
      return (triggerType: keyof PageBuriedPointConfig) => {
        switch (triggerType) {
          case 'triggerElements':
            initTriggerElements(vm, context, pageConfig[triggerType])
            break
          case 'triggerTime':
            initTriggerTime(vm, context, pageConfig[triggerType])
            break
          case 'triggerState':
            initTriggerState(vm, context, pageConfig[triggerType])
            break
          default:
            break
        }
      }
    }

    app.mixin({
      beforeRouteLeave(this: ComponentPublicInstance, to, from) {
        const context = vmCtx(this)
        context && (context.paths[PathFlag.NEXT] = from.path)
        const hook = getHook(from.path, PageHookName.BEFORE_LEAVE)
        if (!(hook && hook.trigger)) return
        if (!(!hook.nextPaths || hook.nextPaths.includes(to.path))) return
        dispatchReport(compositionData(this, hook.payload))

        // dispatchReport(payload)
      },
      beforeRouteEnter(to, from, next) {
        next((vm) => {
          const _config = config[vm.$route.path]
          if (!_config) return
          vm.$isRouterRootComp = true
          const context =
            vm.$buriedPointContext || (vm.$buriedPointContext = createContext())
          context.paths = [from.path, to.path]
          const hook = getHook(from.path, PageHookName.AFTER_ENTER)
          if (
            hook &&
            hook.trigger &&
            (!hook.prePaths || hook.prePaths.includes(from.path))
          ) {
            dispatchReport(compositionData(vm, hook.payload))
          }
          const initTrigger = createInitTriggerInvoker(vm, context, _config)
          initTrigger('triggerElements')
          initTrigger('triggerState')
          initTrigger('triggerTime')
        })
      },
      beforeUnmount(this: ComponentPublicInstance) {
        if (this.$isRouterRootComp) {
          const timers = ctx(this, 'timers')
          if (timers) {
            timers.forEach((i) => clearTimeout)
          }
        }
        // if(this.$buriedPointContext)
      }
    })
  }
}

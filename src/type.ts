namespace BuriedPoint {
  type Maybe<T> = T | undefined | null

  export enum ElementOnceFlag {
    APP = 'app',
    PAGE = 'page'
  }

  export enum ElementTriggerAction {
    /**点击时触发 */
    CLICK = 'click'
  }

  export interface BuriedPointConfig {
    [path: string]: /**path */ PageBuriedPointConfig
  }

  export type HookName = 'afterEnter' | 'beforeLeave'

  export interface PageBuriedPointConfig {
    /**进入页面多久后触发 */
    triggerTime?: TimeConfig[]
    /**在页面的某个hook触发 */
    hooks?: Record<HookName, HookConfig>
    /**与某个元素产生交互时触发 */
    triggerElements?: ElementConfig[]
    /**页面某些数据状态发生变化时触发 */
    triggerState?: StateConfig[]
  }

  export interface TimeConfig {
    /**经过 "time" ms后触发 */
    time: number
    /**触发时传给后台的数据 */
    payload: Payload
  }

  export interface HookConfig {
    /**是否触发 */
    trigger?: boolean
    /**触发时传给后台的数据 */
    payload: Payload
    /**
     * 上个页面在prePaths中时才会触发
     * 默认不限制
     * 为[]时表示任何时候都不触发
     * 该选项仅在afterEnter时有用
     */
    prePaths?: Maybe<string[]>
    /**
     * 下个页面在nextPaths中时才会触发
     * 规则同上
     * 该选项仅在afterEnter时有用
     */
    nextPaths?: Maybe<string[]>
  }

  export interface ElementConfig {
    /**元素选择器 */
    selector: string
    /**
     * 触发的目标是否是与该选择器匹配的所有元素
     * 默认true
     */
    findAll: boolean
    /**
     * 在某项行为发生时触发，如：点击
     */
    action: ElementTriggerAction
    /**触发时传给后台的数据 */
    payload: Payload
    /**
     * 是否只触发一次
     * 为空时表示不限制
     * 'app'表示在整个应用周期内只触发一次
     * 'page'表示在整个页面周期内触发一次
     */
    once?: Maybe<ElementOnceFlag>
    /**
     * 每次触发的间隔时间，单位ms
     * 默认且最小值为100ms
     */
    throttle?: number
  }

  export interface Payload {
    /**配置该属性时，每次上报都会携带该属性 */
    flag: string
    /**
     * 触发时要携带的页面的数据
     * 将会从页面当前组件实例上获取数据
     * 每一项是对象中的值的path
     */
    pageData?: string[]
  }

  export interface StateConfig {
    /**要监听的数据的path */
    dataPath: string
    /**
     * 在达到期望值时触发
     * 只支持字符串和布尔值
     * 为空时表示数据发生变化时就触发
     */
    expectValue?: string | boolean
    /**触发时传给后台的数据 */
    payload: Payload
    /**
     * 每次触发的间隔时间，单位ms
     * 默认且最小值为100ms
     */
    throttle?: number
  }
}

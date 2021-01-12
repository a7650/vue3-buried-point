import { BuriedPointContext } from './type'

declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $isRouterRootComp: boolean | undefined
    $buriedPointContext: BuriedPointContext | undefined
  }
}

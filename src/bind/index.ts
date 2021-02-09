import { Spec } from '../spec'

export interface Specified {
  spec: Spec
  name: string
}

export { scalar } from './scalar'
export * from './directive'
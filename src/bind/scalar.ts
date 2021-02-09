import { Coder, customScalar, CustomScalarOf } from '../serde'
import { Spec } from '../spec'
import type { Specified } from '.'

export default scalar

export function scalar(spec: Spec) {
  return <C extends Coder<any>>(name: string, coder: C): CustomScalarOf<C> & Specified => {
    return Object.assign(customScalar(coder), {spec, name}) as any
  }
}
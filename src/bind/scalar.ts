import type { Specified } from '.'

import { Coder, customScalar, CustomScalarOf } from '../serde'
import { ok } from '../err'

export default scalar

export function scalar<
  S extends string,
  N extends string,
  C extends Coder<any>=Coder<string>
>(spec: S, name: N, coder?: C): CustomScalarOf<C> & Specified<S, N> {
  return Object.assign(customScalar(
    coder ? coder
      : { decode(repr) { return ok(repr) } }  
  ), {spec, name}) as any
}
export interface Specified<S extends string, N extends string> {
  spec: S
  name: N
}

export type Specified_SpecOf<S extends Specified<any, any>>
  = S extends Specified<infer S, any>
    ? S
    : never

export type Specified_NameOf<S extends Specified<any, any>>
  = S extends Specified<any, infer N>
    ? N
    : never
export interface SpecifiedData<
  S extends string,
  N extends string,
  Node,
  D
> extends Specified<S, N> {
  node: Node
  data: D
}

export { scalar } from './scalar'
export * from './directive'
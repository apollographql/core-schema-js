import type { Result } from '../err'
import type { Maybe } from '../is'

export * from './metadata'
export * from './list'
export * from './struct'
export * from './scalar'
export * from './nullability'

/**
 * `SerDe<T, N>` can `serialize` some value type `T` into some node type `N` and
 * `deserialize` an `N` back into a `T`.
 * 
 * `SerDe` is convenient shorthand for (the many) situations where serialization and
 * deserialization types are symmetric. It is possible to have objects which serialize
 * and deserialize different types, or which can only serialize or only deserialize.
 * These should be declared with `Serialize` and `Deserialize` directly, rather than
 * as `SerDe`.
 */
export type SerDe<T=any, N=any>
  = Serialize<T, N> & Deserialize<T, N>

export interface Serialize<T=any, N=any> {
  serialize: SerFn<T, N>
}
export interface SerFn<T, N> {
  (value: T): Maybe<N>
}

export interface Deserialize<T=any, N=any> {
  deserialize: DeFn<T, N>
}

export interface DeFn<T, N> {
  (node: Maybe<N>): Result<T>
}

export type De_TypeOf<S extends Deserialize<any, any>> =
  S extends Deserialize<infer T, any>
    ? T
    : never

export type Ser_TypeOf<S extends Serialize<any, any>> =
  S extends Serialize<any, infer N>
    ? N
    : never

export type De_NodeOf<D extends Deserialize<any, any>> =
  D extends Deserialize<any, infer I>
    ? I
    : never

export type Ser_NodeOf<S extends Serialize<any, any>> =
    S extends Serialize<any, infer O>
      ? O
      : never

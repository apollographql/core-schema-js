import ERR, { Err, isOk, ok, Result } from '../err'
import { Deserialize, De_NodeOf, De_TypeOf } from '.'
import { Shape } from './struct'

export default oneOf

export const ErrReadForm = ERR `ReadForm` (
  (props: { name: string }) => `could not read form ${props.name}`)

export const ErrNoMatch = ERR `NoMatch` (
  () => `no forms matched`)

export type OneOf<S extends Shape> =
  Deserialize<Variant<S>, De_NodeOf<S[keyof S]>>

export type Variant<S extends Shape> = {
  [k in keyof S]: { is: k } & PickOne<S, k>
}[keyof S]

export type PickOne<S extends Shape, pick extends keyof S> = {
  [k in keyof S]:
    k extends pick
      ? De_TypeOf<S[k]>
      : never
}

export function oneOf<S extends Shape>(forms: S): OneOf<S> {
  return {
    deserialize(node): Result<Variant<S>> {
      const errors: Err[] = []
      for (const [is, de] of Object.entries(forms)) {
        const res = de.deserialize(node)
        if (isOk(res)) return ok({ is, [is]: res.ok } as Variant<S>, node)
        errors.push(ErrReadForm({ name: is, node }, res))
      }
      return ErrNoMatch({ node }, ...errors)
    }
  }
}

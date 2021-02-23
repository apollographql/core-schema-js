import { ListValueNode, NullValueNode } from 'graphql'
import { isAst, Maybe } from '../is'
import ERR, { ok, siftValues } from '../err'
import type { SerDe, Serialize, Deserialize, De_TypeOf } from '.'
import { NullValue } from './nodes'

export const ErrReadList = ERR `ReadList` (() => `error deserializing list`)

/**
 * SerDe a list of `type`, where `type` is a `SerDe` to/from `ValueNodes`.
 * 
 * @param type 
 */
export function list<T extends SerDe>(type: T):
  Serialize<Maybe<De_TypeOf<T>[]>, ListValueNode | NullValueNode> &
  Deserialize<Maybe<De_TypeOf<T>[]>, ListValueNode | NullValueNode>
{
  return {
    serialize: (values: Maybe<De_TypeOf<T>[]>) =>
      values ? {
        kind: 'ListValue' as 'ListValue',
        values: values.map(v => type.serialize(v)!).filter(Boolean)
      } : NullValue,
    deserialize: (node: Maybe<ListValueNode | NullValueNode>) => {
      if (!node || isAst(node, 'NullValue')) return ok(null, node)
      const results = node.values
        .map(v => type.deserialize(v as any))
      const [errors, values] = siftValues(results)
      if (errors.length) return ErrReadList({ node: node! }, ...errors)
      return ok(values, node)
    }
  }
}
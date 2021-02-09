import { NullValueNode, ASTNode } from 'graphql'
import { Maybe, Must } from '../is'
import ERR, { ok, Result, isErr } from '../err'
import { Serialize, Deserialize, De_TypeOf, Ser_TypeOf, Ser_NodeOf, De_NodeOf } from '.'
import { NullValue, isNullNode } from './nodes'

export const ErrNullNode = ERR `NullNode`
  ((props: { node: Maybe<ASTNode> }) =>
    `expected non-null node, got ${props.node?.kind}`)

export const ErrNullValue = ERR `NullValue`
  ((props: { value: any }) =>
    `expected non-null value, got ${props.value}`)

/**
 * Convert a Ser/De which does not accept null values or produce NullValueNodes into one
 * which does.
 * 
 * @param type the underlying type
 */
export function maybe<S extends Serialize & Deserialize>({serialize, deserialize}: S):
  Serialize<Maybe<De_TypeOf<S>>, Ser_NodeOf<S> | NullValueNode> &
  Deserialize<Maybe<De_TypeOf<S>>, De_NodeOf<S> | NullValueNode>
{
  return {
    serialize(val: Maybe<De_TypeOf<S>>) {
      if (val == null) return NullValue
      return serialize(val)
    },
    deserialize(node: Maybe<De_NodeOf<S> | NullValueNode>) {
      if (!node || isNullNode(node)) return ok(null, node)
      return deserialize(node)
    },
  }
}

/**
 * Convert a Ser/De which accepts null values and produces NullValueNodes into one
 * which instead returns ErrNullValue or ErrNullNode, respectively.
 * 
 * @param type  the underlying type
 */
export function must<S extends Serialize & Deserialize>(type: S):
  Serialize<Must<De_TypeOf<S>>, Exclude<Ser_NodeOf<S>, NullValueNode>> &
  Deserialize<Must<De_TypeOf<S>>, Exclude<De_NodeOf<S>, NullValueNode>>
{
  return Object.create(type, {
    deserialize: {
      value(node: Maybe<Ser_TypeOf<S>>): Result<Must<De_TypeOf<S>>> {
        if (!node || isNullNode(node))
          return ErrNullNode({ node })
        const result = type.deserialize(node)
        if (!isErr(result) && result.ok == null)
          return ErrNullValue({ node, value: result.ok })
        return result
      }
    }
  })
}
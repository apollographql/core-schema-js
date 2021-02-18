import type { Serialize, Deserialize } from '.'
import type { EnumValueNode, FloatValueNode, IntValueNode, NullValueNode, BooleanValueNode, StringValueNode, ValueNode } from 'graphql'
import { isAst, Maybe } from '../is'

import ERR, { Result, ok } from '../err'
import { NullValue, ErrWrongNodeKind } from './nodes'

export const ErrReadNaN = ERR `ReadNaN` (
  (props: { repr: string }) => `"${props.repr}" decoded to NaN`)

export const ErrReadIntRange = ERR `ReadIntRange` (
  (props: { repr: string }) => `"${props.repr}" out of range for integers`)

export type ScalarKind = (
  EnumValueNode
  | FloatValueNode
  | IntValueNode
  | NullValueNode
  | BooleanValueNode
  | StringValueNode
)["kind"]

export function scalar<T, K extends ScalarKind>(
  kind: K,
  decode: (repr: string) => Result<T>,
  encode: (value: T) => string = v => String(v)
): Serialize<Maybe<T>, ValueNode | NullValueNode> & Deserialize<Maybe<T>, ValueNode | NullValueNode> {
  return {
    serialize(value: Maybe<T>) {
      if (!value) return NullValue
      return {
        kind,
        value: encode(value)
      } as any
    },
    deserialize(node: Maybe<ValueNode>) {
      if (!node || isAst(node, 'NullValue')) return ok(null, node)      
      if (isAst(node, kind) && hasValue(node))
        return decode(node.value)
      return ErrWrongNodeKind({ expected: [kind], node })
    }
  }
}

export const Int = scalar(
  'IntValue',
  repr => {
    const decoded = +repr
    if (Number.isNaN(decoded)) return ErrReadNaN({ repr })
    if (!Number.isSafeInteger(decoded)) ErrReadIntRange({ repr })
    return ok(decoded)
  }
)

export const Bool = scalar(
  'BooleanValue',
  repr => ok(!!repr),
)

export const Float = scalar(
  'FloatValue',
  repr => {
    const decoded = +repr
    if (Number.isNaN(decoded)) return ErrReadNaN({ repr })
    return ok(decoded)
  }
)

export const Str = scalar(
  'StringValue',
  repr => ok(repr),
)

export interface Coder<T> {
  decode(repr: string): Result<T>,
  encode?(value: T): string
}

export type CoderTypeOf<C extends Coder<any>> =
  C extends Coder<infer T>
    ? T
    : never

export type CustomScalarOf<C extends Coder<any>> =
  C extends Coder<infer T>
    ? Serialize<Maybe<T>, ValueNode> & Deserialize<Maybe<T>, ValueNode>
    : never

export function customScalar<T>(coder: Coder<T>) {
  const encode = coder.encode
    ? (value: T) => coder.encode!(value)
    : (value: T) => String(value)
  const decode = (repr: string) => coder.decode(repr)
  return scalar('StringValue', decode, encode)
}

export const hasValue = (o: any): o is { value: string } =>
  typeof o?.value !== 'undefined'
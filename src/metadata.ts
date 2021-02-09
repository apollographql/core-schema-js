import { ValueNode, DirectiveNode, EnumValueNode,
  FloatValueNode, IntValueNode, ListValueNode,
  ObjectValueNode, StringValueNode, NullValueNode,
  BooleanValueNode, ASTNode, ObjectFieldNode, ArgumentNode }
  from 'graphql'

import {derive} from './data'
import ERR, { asResultFn, isErr, isOk, ok, Result, siftValues } from './err'
import { Fn, Maybe, Must } from './is'

export const ErrReadField = ERR `ReadField` (
  (props: { name: string }) => `could not read field "${props.name}"`
)

export const ErrReadObject = ERR `ReadObject` (
  ({ }) => `could not read object`
)

export const ErrBadReadNode = ERR `BadReadNode` (
  (props: { expected: string[], node: Maybe<ASTNode> }) =>
    `expected node of type ${props.expected.join(' | ')}, got ${props.node?.kind}`
)

export const ErrReadNaN = ERR `ReadNaN`
  ((props: { repr: string }) => `"${props.repr}" decoded to NaN`)

export const ErrReadIntRange = ERR `ReadIntRange`
  ((props: { repr: string }) => `"${props.repr}" out of range for integers`)

export const ErrReadList = ERR `ReadList` (() => `error reading list`)

/**
 * Key-ValueNode mapping extracted from a DirectiveNode or ObjectValueNode
 */
export interface Metadata {
  [key: string]: ValueNode
}

/**
 * Metadata for an AST node
 */
export const metadata = derive <Metadata, DirectiveNode | ObjectValueNode>
  `Key value mapping over arguments or fields` (target => {
    const args = target.kind === 'Directive' ? target.arguments : target.fields
    const meta: any = {}
    for (const arg of args ?? []) {
      meta[arg.name.value] = arg.value
    }
    return meta
  })


/**
 * Return true iff o can carry metadata (it is a DirectiveNode or
 * ObjectValueNode).
 *
 * @param o input
 */
export function isMetadataTarget(o: any): o is DirectiveNode | ObjectValueNode {
  const kind = o?.kind
  return kind === 'Directive' || kind === 'ObjectValue'
}

export type Kind = ASTNode["kind"]
export type NodeForKind<K extends Kind> = ASTNode & { kind: K }

export interface Serialize<T, N> {
  serialize(value: T): Maybe<N>
}

export interface Deserialize<T, N> {
  deserialize(node: Maybe<N>): Result<T>
}

export type Deserialized<S extends Deserialize<any, any> | Serialize<any, any>> =
  S extends Deserialize<infer T, any>
    ? T
    :
  S extends Serialize<infer T, any>
    ? T
    : never

export type Serialized<S extends Serialize<any, any> | Deserialize<any, any>> =
  S extends Serialize<any, infer N>
    ? N
    :
  S extends Deserialize<any, infer N>
    ? N
    : never

export type Serde<T, N extends ASTNode>
  = Serialize<T, N> & Deserialize<T, N>

const isNullNode = (n: any): n is NullValueNode => n.kind === 'NullValue'

type InputNodeOf<D extends Deserialize<any, any>> =
  D extends Deserialize<any, infer I>
    ? I
    : never

type OutputNodeOf<S extends Serialize<any, any>> =
    S extends Serialize<any, infer O>
      ? O
      : never

export class Slot<T, I extends ASTNode, O extends ValueNode>
  implements
    Serialize<T, O>,
    Deserialize<T, I>
{
  constructor(
    public readonly serialize: Serde<T, O>["serialize"],
    public readonly deserialize: Serde<T, I>["deserialize"]
  ) {}

  default(defaultValue: Must<T>): Slot<Must<T>, I, Exclude<O, NullValueNode>> {
    const {deserialize} = this
    return Object.create(this, {
      defaultValue: { get() { return defaultValue } },
      deserialize: {
        value(node: Maybe<I>): Result<Must<T>> {
          const result = deserialize(node)
          if (!isErr(result) && result.ok == null)
            return ok(defaultValue, node)
          return result as Result<Must<T>>
        }
      }
    })
  }

  mapDe<F extends Fn<I, any>>(fn: F): Slot<ReturnType<F>, I, O> {
    return mapDe(this, fn as any)
  }

  get maybe(): Slot<Maybe<T>, I | NullValueNode, O | NullValueNode> {
    return maybe(this) as any
  }

  get must(): Slot<Must<T>, Exclude<I, NullValueNode>, Exclude<O, NullValueNode>> {
    return must(this) as any
  }
}

export function mapDe<
  S extends Slot<any, any, any>,
  F extends Fn<Deserialized<S>, any>
>(slot: S, fn: F): Slot<ReturnType<F>, InputNodeOf<S>, OutputNodeOf<S>> {
  const resultFn = asResultFn(fn) as any
  return Object.create(slot, {
    deserialize: {
      value(node: Maybe<InputNodeOf<S>>) {
        const result = slot.deserialize(node)
        if (!isOk(result)) return result
        return resultFn(result.ok)
      }
    }
  })
}


export function slot<T, D extends ValueNode>(
  serialize: Serde<T, D>["serialize"],
  deserialize: Serde<T, D>["deserialize"],
): Slot<T, D, D> {
  return new Slot(serialize, deserialize)
}


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
) {
  return slot<Maybe<T>, ValueNode>(
    (value: Maybe<T>) => {
      if (!value) return NullValue
      return {
        kind,
        value: encode(value)
      } as any
    },
    (node: Maybe<ValueNode>) => {
      if (!node || isNullNode(node)) return ok(null, node)      
      if (node?.kind === kind && hasValue(node))
        return decode(node.value)
      return ErrBadReadNode({ expected: [kind], node })
    }
  )
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
    ? Slot<Maybe<T>, ValueNode, ValueNode>
    : never

export function customScalar<T>(coder: Coder<T>) {
  const encode = coder.encode
    ? (value: T) => coder.encode!(value)
    : (value: T) => String(value)
  const decode = (repr: string) => coder.decode(repr)
  return scalar('StringValue', decode, encode)
}

function maybe<S extends Slot<any, any, any>>({serialize, deserialize}: S):
  Slot<Maybe<Deserialized<S>>, Serialized<S> | NullValueNode, Serialized<S> | NullValueNode>
{
  return slot(
    (val: Maybe<Deserialized<S>>) => {
      if (val == null) return NullValue
      return serialize(val)
    },
    (node: Serialized<S> | NullValueNode) => {
      if (!node || isNullNode(node)) return ok(null, node)
      return deserialize(node)
    }
  )
}

function must<S extends Slot<any, any, any>>(type: S):
  Slot<Must<Deserialized<S>>, Exclude<Serialized<S>, NullValueNode>, Exclude<Serialized<S>, NullValueNode>>
{
  const {deserialize} = type
  return Object.create(type, {
    deserialize: {
      value(node: Maybe<Serialized<S>>): Result<Must<Deserialized<S>>> {
        if (!node || isNullNode(node))
          return ErrBadReadNode({ node: node!, expected: ['(non-null)'] })
        const underlying = deserialize(node)
        if (!isErr(underlying) && underlying.ok == null)
          return ErrBadReadNode({ node: node!, expected: ['(non-null)'] })
        return underlying
      }
    }
  })
}


export function list<T, V extends ValueNode>(type: Serde<T, V>) {
  return slot<T[], ListValueNode>(
    (values: T[] = []) => ({
      kind: 'ListValue' as 'ListValue',
      values: values.map(v => type.serialize(v))
    }) as any,
    (node: Maybe<ListValueNode>) => {
      const results = ((node as ListValueNode)?.values ?? [])
        .map(v => type.deserialize(v as any))
      const [errors, values] = siftValues(results)
      if (errors.length) return ErrReadList({ node: node! }, ...errors)
      return ok(values, node)
    }
  )
}



export interface ObjShape {
  [key: string]: Serde<any, any>
}

export type DeserializedShape<S extends ObjShape> = {
  [K in keyof S]: Deserialized<S[K]>
}

export type ObjOf<S extends ObjShape> = Slot<
  Maybe<DeserializedShape<S>>,
  ObjectValueNode | NullValueNode | DirectiveNode,
  ObjectValueNode | NullValueNode
>

export function obj<S extends ObjShape>(shape: S): ObjOf<S> {
  return slot(
    (value: DeserializedShape<S>) => {
      if (!value) return NullValue
      return {
        kind: 'ObjectValue',
        fields: serializeFields(shape, value, 'ObjectField')
      }
    },
    (node: Maybe<ObjectValueNode | NullValueNode | DirectiveNode>) => {
      if (!isMetadataTarget(node))
        return ErrBadReadNode({ node, expected: ['ObjectValueNode', 'DirectiveNode'] })
      const md = metadata(node)
      const results = Object.entries(shape)
        .map(([name, type]) => ({
          name,
          field: md[name],
          result: type.deserialize(md[name])
        }))
      const errors = []
      const entries = []
      for (const {name, field, result} of results) {
        if (isErr(result))
          errors.push(ErrReadField({
            name,
            node: field
          }, result))
        if (isOk(result))
          entries.push([name, result.ok])
      }
      if (errors.length) return ErrReadObject({ node }, ...errors)
      return ok(Object.fromEntries(entries), node)
    }
  )
}

function serializeFields<
  S extends ObjShape,
  K extends 'ObjectField' | 'Argument'
>(
  shape: S,
  value: DeserializedShape<S>,
  kind: K
): K extends 'ObjectField' ? ObjectFieldNode[] : ArgumentNode[] {
  return Object.entries(shape)
    .map(([name, type]) => ({
      kind,
      name: { kind: 'Name' as 'Name', value: name },
      value: type.serialize(value[name])
    })) as any
}

const NullValue = { kind: 'NullValue' as 'NullValue' }

const hasValue = (o: any): o is { value: string } =>
  typeof o?.value !== 'undefined'

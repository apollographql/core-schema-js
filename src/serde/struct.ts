import { ObjectValueNode, NullValueNode, DirectiveNode, ObjectFieldNode, ArgumentNode } from 'graphql'
import { Maybe } from 'graphql/jsutils/Maybe'
import ERR, { isErr, isOk, ok } from '../err'
import { De_TypeOf, SerDe, Serialize, Deserialize } from '.'
import { HasMetadata, hasMetadata, metadata } from './metadata'
import { ErrWrongNodeKind, NullValue } from './nodes'

/**
 * Shapes are JS objects mapping between field names and SerDes.
 */
export interface Shape {
  [key: string]: SerDe
}

export type Shape_DeTypeOf<S extends Shape> = {
  [K in keyof S]: De_TypeOf<S[K]>
}

/**
 * Structs ser/de objects with named fields. They're named "structs"
 * rather than "objects" because they are a bit more general: namely, they can deserialize
 * from any `HasMetadata` value (`ObjectValueNode`s and `DirectiveNode`s).
 */
export type Struct<S extends Shape> =
  Serialize<Maybe<Shape_DeTypeOf<S>>, ObjectValueNode | NullValueNode> &
  Deserialize<Maybe<Shape_DeTypeOf<S>>, HasMetadata | NullValueNode>

export const ErrReadField = ERR `ReadField` (
  (props: { name: string }) => `could not read field "${props.name}"`)

export const ErrReadStruct = ERR `ReadStruct` (
  () => `could not read struct`)

/**
 * Structs are objects with named fields. They're named "structs" rather than "objects"
 * because they are a bit more general: namely, they can deserialize from any `HasMetadata`
 * value (`ObjectValueNode`s and `DirectiveNode`s).
 * 
 * @param shape 
 */
export function struct<S extends Shape>(shape: S): Struct<S> {
  return {
    serialize: (value: Maybe<Shape_DeTypeOf<S>>) => {
      if (!value) return NullValue
      return {
        kind: 'ObjectValue',
        fields: serializeFields(shape, value, 'ObjectField')
      }
    },
    deserialize: (node: Maybe<ObjectValueNode | NullValueNode | DirectiveNode>) => {
      if (!hasMetadata(node))
        return ErrWrongNodeKind({ node, expected: ['ObjectValueNode', 'DirectiveNode'] })
      const md = metadata(node)
      const results = Object.entries(shape)
        .map(([name, type]) => ({
          name,
          field: md.get(name),
          result: type.deserialize(md.get(name))
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
      if (errors.length) return ErrReadStruct({ node }, ...errors)
      return ok(Object.fromEntries(entries), node)
    }
  }
}

function serializeFields<
  S extends Shape,
  K extends 'ObjectField' | 'Argument'
>(
  shape: S,
  value: Shape_DeTypeOf<S>,
  kind: K
): K extends 'ObjectField' ? ObjectFieldNode[] : ArgumentNode[] {
  return Object.entries(shape)
    .map(([name, type]) => ({
      kind,
      name: { kind: 'Name' as 'Name', value: name },
      value: type.serialize(value[name])
    })) as any
}

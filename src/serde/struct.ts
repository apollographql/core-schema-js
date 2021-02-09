import { ObjectValueNode, NullValueNode, DirectiveNode, ObjectFieldNode, ArgumentNode } from "graphql"
import { Maybe } from "graphql/jsutils/Maybe"
import { isErr, isOk, ok } from "../err"
import { NullValue, Deserialized, ErrBadReadNode, ErrReadField, ErrReadObject, metadata, Serde, Slot, slot } from "."
import { hasMetadata } from "./metadata"

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
      if (!hasMetadata(node))
        return ErrBadReadNode({ node, expected: ['ObjectValueNode', 'DirectiveNode'] })
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

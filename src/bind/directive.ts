import { ASTNode, DirectiveLocationEnum, DocumentNode, EnumTypeDefinitionNode, EnumValueNode, FieldDefinitionNode, InputObjectTypeDefinitionNode, InputValueDefinitionNode, InterfaceTypeDefinitionNode, ObjectTypeDefinitionNode, ScalarTypeDefinitionNode, SchemaDefinitionNode, UnionTypeDefinitionNode, visit } from 'graphql'
import { Spec, } from '../spec'
import { Shape, Struct, struct, Shape_DeTypeOf } from '../serde'
import ERR, { isOk } from '../err'
import { derive, Get, GetFn } from '../data'
import { Maybe } from '../is'
import { using, report } from '../schema'
import { ensureDocumentOf } from '../linkage'

const ErrBadMetadata = ERR `BadMetadata` (
  () => `could not read metadata`
)

const ErrBadForm = ERR `BadMetadataForm` (
  (props: { name: string }) => `could not read form ${props.name}`
)

export default directive

export function directive(spec: Spec) {
  return <F extends Forms>(forms: F): Layer<F> => {
    const forKind = new Map<ASTNode["kind"], {
      name: string,
      form: Form,
      read: Struct<Forms_UnionOf<F>>
    }[]>()
    const structs: any = {}
    for (const [name, form] of Object.entries(forms)) {
      const read = structs[name] = struct(form.shape)
      form.nodeKinds.forEach(kind =>
        getOrInsertWith(forKind, kind, () => [])
          .push({ name, form, read })
      )
    }

    const nameInDoc = derive <Maybe<string>, DocumentNode>
      `name of ${spec} in document`
      (doc => {
        const requests = using(doc)
        for (const r of requests) {
          if (r.using.identity === spec.identity &&
            spec.version.satisfies(r.using.version)) {
              return r.as ?? r.using.name
          }
        }
        return null
      })

    const all = derive <Bind<F>[], ASTNode>
      `${spec}` (
        (node: ASTNode) => {
          if (node.kind === 'Document') {
            const output: Bind<F>[] = []
            visit(node, { enter(node) {
              if (node.kind !== 'Document') output.push(...all(node))
            } })
            return output
          }

          const doc = ensureDocumentOf(node)
          const forms = forKind.get(node.kind)
          if (!forms) return []

          const self = nameInDoc(doc)
          const output: Bind<F>[] = []
          for (const dir of directivesOf(node)) {
            if (dir.name.value !== self) continue
            const errors = []
            let found = null
            for (const form of forms) {
              const res = form.read.deserialize(dir)
              if (isOk(res)) {
                found = { form, result: res }
                break
              }
              errors.push(ErrBadForm({ name: form.name, node: dir }, res))
            }
            if (!found) {
              report(ErrBadMetadata({ node: dir }, ...errors))
              continue
            }
            output.push({
              is: found.form.name,
              on: node,
              [found.form.name]: found.result.ok
            } as any)
          }
          // TODO: Validate non-repeatable directives here
          return output
        }
      )

    const formsByName = Object.fromEntries(
      Object.keys(forms)
        .map(name => [
          name,
          Object.assign(
            derive <Shape_DeTypeOf<Forms_UnionOf<F>>[], ASTNode>
            `${spec}#${name}` (node =>
              all(node).map(bind => bind[name]).filter(Boolean)
            ),
            structs[name]
          )
        ])
    )
    
    return Object.assign(all, {spec: spec}, formsByName) as any
  }
}

export type Layer<F extends Forms> = { spec: Spec }
  & Get<Bind<F>[], ASTNode, []>
  & GetFn<Bind<F>[], ASTNode, []>
  & {
      [name in keyof F]: 
        Get<Shape_DeTypeOf<Form_ShapeOf<F[name]>>[],
            ASTNode,
            []> &
        GetFn<Shape_DeTypeOf<Form_ShapeOf<F[name]>>[],
            ASTNode,
            []> &
        Struct<Form_ShapeOf<F[name]>>
    }

/**
 * Bind<F> represents a binding of a particular metadata form to
 * the AST. The name of the form is given as `is`, and then keys
 * the extracted data. For example:
 * 
 * { is: 'Using', Using: <using data> }
 */
export type Bind<F extends Forms> = {
  [k in keyof F]: { is: k } & PickDeShape<F, k>
}[keyof F]
  

export type PickDeShape<F extends Forms, pick extends keyof F> = {
  [k in keyof F]:
    k extends pick
      ? Shape_DeTypeOf<Form_ShapeOf<F[k]>>
      : never
}

function getOrInsertWith<K, V>(map: Map<K, V>, key: K, fn: (key: K) => V): V {
  const existing = map.get(key)
  if (existing != null) return existing
  const created = fn(key)
  map.set(key, created)
  return created
}

export interface Form<S extends Shape=any> {
  shape: S
  nodeKinds: ASTNode["kind"][]
  repeatable: boolean
}

export type Form_ShapeOf<F extends Form<any>>
  = F extends Form<infer S>
    ? S
    : never
  
export interface Forms<F=Form> {
  [formName: string]: F
}

export type Forms_UnionOf<F extends Forms> = Form_ShapeOf<F[keyof F]>

export function one<S extends Shape, On extends DirectiveLocationEnum>(shape: S, ...on: On[]): Form<S> {
  return {
    shape,
    nodeKinds: on.map(locToKind),
    repeatable: false,
  }
}

export function repeatable<S extends Shape, On extends DirectiveLocationEnum>(shape: S, ...on: On[]): Form<S> {
  return {
    shape,
    nodeKinds: on.map(locToKind),
    repeatable: true,
  }
}

function directivesOf(node: ASTNode) {
  return 'directives' in node ? node.directives ?? [] : []
}

type NodeFor<L extends DirectiveLocationEnum>
  =
  L extends 'SCHEMA'
  ? SchemaDefinitionNode
  :
  L extends 'SCALAR'
  ? ScalarTypeDefinitionNode
  :
  L extends 'OBJECT'
  ? ObjectTypeDefinitionNode
  :
  L extends 'FIELD_DEFINITION'
  ? FieldDefinitionNode
  :
  L extends 'ARGUMENT_DEFINITION'
  ? InputValueDefinitionNode
  :
  L extends 'INTERFACE'
  ? InterfaceTypeDefinitionNode
  :
  L extends 'UNION'
  ? UnionTypeDefinitionNode
  :
  L extends 'ENUM'
  ? EnumTypeDefinitionNode
  :
  L extends 'ENUM_VALUE'
  ? EnumValueNode
  :
  L extends 'INPUT_OBJECT'
  ? InputObjectTypeDefinitionNode
  :
  L extends 'INPUT_FIELD_DEFINITION'
  ? InputValueDefinitionNode
  : never
  

function locToKind<L extends DirectiveLocationEnum>(on: L): NodeFor<L>["kind"] {
  return locationToKind[on] as any
}


const locationToKind: { [loc in DirectiveLocationEnum]?: ASTNode["kind"] } = {
  // // Request Definitions
  // QUERY: 'QUERY';
  // MUTATION: 'MUTATION';
  // SUBSCRIPTION: 'SUBSCRIPTION';
  // FIELD: 'FIELD';
  // FRAGMENT_DEFINITION: 'FRAGMENT_DEFINITION';
  // FRAGMENT_SPREAD: 'FRAGMENT_SPREAD';
  // INLINE_FRAGMENT: 'INLINE_FRAGMENT';
  // VARIABLE_DEFINITION: 'VARIABLE_DEFINITION';

  // Type System Definitions
  SCHEMA: 'SchemaDefinition',
  SCALAR: 'ScalarTypeDefinition',
  OBJECT: 'ObjectTypeDefinition',
  FIELD_DEFINITION: 'FieldDefinition',
  ARGUMENT_DEFINITION: 'InputValueDefinition',
  INTERFACE: 'InterfaceTypeDefinition',
  UNION: 'UnionTypeDefinition',
  ENUM: 'EnumTypeDefinition',
  ENUM_VALUE: 'EnumValue',
  INPUT_OBJECT: 'InputObjectTypeDefinition',
  INPUT_FIELD_DEFINITION: 'InputValueDefinition',
};

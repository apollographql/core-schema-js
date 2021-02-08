import type { ASTNode, DirectiveLocationEnum, DocumentNode, EnumTypeDefinitionNode, EnumValueNode, FieldDefinitionNode, InputObjectTypeDefinitionNode, InputValueDefinitionNode, InterfaceTypeDefinitionNode, ObjectTypeDefinitionNode, ScalarTypeDefinitionNode, SchemaDefinitionNode, UnionTypeDefinitionNode } from 'graphql'
import { Spec, } from './spec'
import { ObjShape, ObjOf, obj, DeserializedShape } from './metadata'
import ERR, { isOk } from './err'
import { derive, Get, GetValue } from './data'
import { asString, AsString, Maybe } from './is'
import { using, report } from './schema'
import { documentOf } from './linkage'

const ErrBadMetadata = ERR `BadMetadata` (
  () => `could not read metadata`
)

const ErrBadForm = ERR `BadMetadataForm` (
  (props: { name: string }) => `could not read form ${props.name}`
)

export default layer

export function layer(...spec: AsString) {
  const specified = Spec.parse(asString(spec))
  return <F extends Forms>(forms: F): Layer<F> => {
    const forKind = new Map<ASTNode["kind"], {
      name: string,
      form: Form,
      read: ObjOf<Forms_UnionOf<F>>
    }[]>()
    const structs: any = {}
    for (const [name, form] of Object.entries(forms)) {
      const read = structs[name] = obj(form.shape)
      form.nodeKinds.forEach(kind =>
        getOrInsertWith(forKind, kind, () => [])
          .push({ name, form, read })
      )
    }

    const nameInDoc = derive <Maybe<string>, DocumentNode>
      `name of ${specified} in document`
      (doc => {
        const requests = using(doc)
        for (const r of requests) {
          if (r.using.identity === specified.identity &&
            specified.version.satisfies(r.using.version)) {
              console.log('name of', specified, '=', r.as ?? r.using.name)
              return r.as ?? r.using.name
          }
        }
        return null
      })

    const all = derive <Bind<F>[], ASTNode>
      `${specified}` (
        node => {
          console.log('looking for', specified, 'in', node.kind, 'we have', [...forKind.keys()])
          const forms = forKind.get(node.kind)
          if (!forms) return []

          const self = nameInDoc(documentOf(node))
          console.log('name is=', self)
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
              errors.push(ErrBadForm({ name: form.name }, res))
            }
            if (!found) {
              report(ErrBadMetadata({}, ...errors))
              continue
            }
            output.push({
              is: found.form.name,
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
            derive <DeserializedShape<Forms_UnionOf<F>>[], ASTNode>
            `${specified}#${name}` (node =>
              all(node).map(bind => bind[name]).filter(Boolean)
            ),
            structs[name]
          )
        ])
    )
    
    return Object.assign(all, {spec: specified}, formsByName) as any
  }
}

export type Layer<F extends Forms> = { spec: Spec }
  & Get<Bind<F>[], ASTNode, []>
  & GetValue<Bind<F>[], ASTNode, []>
  & {
      [name in keyof F]: 
        Get<DeserializedShape<Form_ShapeOf<F[name]>>[],
            ASTNode,
            []> &
        GetValue<DeserializedShape<Form_ShapeOf<F[name]>>[],
            ASTNode,
            []> &
        ObjOf<Form_ShapeOf<F[name]>>
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
      ? DeserializedShape<Form_ShapeOf<F[k]>>
      : never
}

function getOrInsertWith<K, V>(map: Map<K, V>, key: K, fn: (key: K) => V): V {
  const existing = map.get(key)
  if (existing != null) return existing
  const created = fn(key)
  map.set(key, created)
  return created
}

export interface Form<S extends ObjShape=any> {
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

export function one<S extends ObjShape, On extends DirectiveLocationEnum>(shape: S, ...on: On[]): Form<S> {
  return {
    shape,
    nodeKinds: on.map(locToKind),
    repeatable: false,
  }
}

export function repeatable<S extends ObjShape, On extends DirectiveLocationEnum>(shape: S, ...on: On[]): Form<S> {
  return {
    shape,
    nodeKinds: on.map(locToKind),
    repeatable: true,
  }
}

function directivesOf(node: ASTNode) {
  return 'directives' in node ? node.directives ?? [] : []
}


// export interface Layer {
//   (doc: DocumentNode): (req: Using) => DirectiveVisitor | null
// }

// export interface DirectiveVisitor {
//   (directive: DirectiveNode, on: ASTNode, onErr: (...err: Err[]) => void): void
// }

// export type Extract<T=any> = Specified<T> & Deserialize<T, ASTNode>

// const ErrBadMetadata = ERR `BadMetadata` (
//   () => `could not read metadata`
// )

// const ErrBadForm = ERR `BadMetadataForm` (
//   (props: { name: string }) => `could not read form ${props.name}`
// )

// export default function lyr(...md: Extract[]) {
//   const byId = new Map<string, Extract[]>()
//   for (const d of md) {
//     const id = d.spec.identity
//     if (!byId.has(id)) byId.set(id, [])
//     byId.get(id)!.push(d)
//   }
//   return (doc: DocumentNode) => (req: Using): DirectiveVisitor | null => {
//     const active = (byId.get(req.using.identity) ?? [])
//       .filter(x => x.spec.version.satisfies(req.using.version))
//     if (!active.length) return null

//     const byName = new Map<string, Map<ASTNode["kind"], Extract[]>>()
//     for (const item of active) {
//       add(item,
//         forName(`${name(req)}__${item.name}`),
//         forName(`${name(req)}`))
//     }

//     return visit

//     function visit(directive: DirectiveNode, on: ASTNode, onErr: (...err: Err[]) => void) {
//       const byKind = byName.get(directive.name.value)
//       if (!byKind) return
//       const extractors = byKind.get(on.kind)
//       if (!extractors) return
//       let succeeded = false
//       let errs = []
//       for (const md of extractors) {
//         const result = md.deserialize(directive)
//         if (isOk(result)) {
//           succeeded = true
//           if (md.repeatable)
//             get(on, md.forNode).push(result.ok)
//           else
//             set(on, md.forNode, result.ok)
//           md.forDoc(doc).push({
//             data: result.ok,
//             directive,
//             on,
//           })
//           break
//         }
//         errs.push(ErrBadForm({ name: md.name, node: directive }, result))
//       }
//       if (!succeeded) onErr(ErrBadMetadata({ node: directive }, ...errs))
//     }

//     function forName(name: string): Map<ASTNode["kind"], Extract[]> {
//       const existing = byName.get(name)
//       if (existing) return existing
//       const created = new Map
//       byName.set(name, created)
//       return created
//     }

//     function add(item: Extract, ...indexes: Map<ASTNode["kind"], Extract[]>[]) {
//       for (const loc of item.on) {
//         const kind = locationToKind[loc]!
//         for (const byKind of indexes) {
//           if (!byKind.has(kind)) byKind.set(kind, [])
//           byKind.get(kind)!.push(item)
//         }
//       }
//     }
//   }
// }


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

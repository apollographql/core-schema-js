import { ASTNode, DirectiveLocationEnum, DirectiveNode } from 'graphql'
import { AnyDirective, Directive_ArgsOf, Directive_DataOf, Directive_NodeOf, NodeFor, Specified_NameOf, Specified_SpecOf } from './bind'
import { derive } from './data'
import { namespaceFor } from './namespace'
import { Dir, dir, Shape_DeTypeOf } from './serde'
import { Spec } from './spec'

import ERR, { Result, siftValues } from './err'
import { ensureDocumentOf } from './linkage'
import { report } from './schema'
import { Maybe } from './is'

export const ErrRepeated = ERR `ErrRepeated` ((props: { fqname: string }) =>
  `non-repeatable directive "${props.fqname}" was found multiple times`)

export const ErrRepetition = ERR `ErrRepetition` ((props: { fqname: string }) =>
  `"${props.fqname}" found here`)

export const scan = <D extends AnyDirective>(
  node: Directive_NodeOf<D>,
  directive: D
): Directive_DataOf<D>[] =>
  scannerFor(directive)(node)

const scannerFor = derive (
  'scanner', <D extends AnyDirective>(directive: D): (node: Directive_NodeOf<D>) => Directive_DataOf<D>[] => {        
    const { spec, name, args, repeatable, locations } = directive
    const self = Spec.parse(spec)
    const fqname = `${spec}#${name}`
    const kinds = new Set(locations.map(locToKind))
    
    type Args = Directive_ArgsOf<D>
    const forDoc = derive(
      `impl ${fqname}`,
      (doc): Maybe<Dir<Args>> => {
        const specifiedName = namespaceFor(doc, self)?.specifiedName(name)
        if (!specifiedName) return null
        return dir(specifiedName, args)
      })

    return derive(
      `results ${fqname}`, (node: Directive_NodeOf<D>): Directive_DataOf<D>[] => {
        if (!kinds.has(node.kind)) return []
        const de = forDoc(ensureDocumentOf(node))

        if (!de) return []
        const results: Result<Shape_DeTypeOf<Args>>[] =
          directivesOn(node).map(de.deserialize)
            // Include errors, exclude nulls
            .filter(r => r.is === 'err' || r.ok) as Result<Shape_DeTypeOf<Args>>[]
        if (!repeatable && results.length > 1) {
          report(ErrRepeated({ fqname, node }),
            ...results.map(r => ErrRepetition({ fqname, node: r.node })))
          return []
        }
        const [errors, values] = siftValues(results)
        report(...errors)        
        return values.map(data => ({
          spec: spec as Specified_SpecOf<D>,
          name: name as Specified_NameOf<D>,
          data,
          node,
        } as Directive_DataOf<D>))
      })
    })

  
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

function directivesOn(node: ASTNode): DirectiveNode[] {
  return (node as any).directives ?? []
}

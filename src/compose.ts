import { ASTNode, DefinitionNode, FieldDefinitionNode, NameNode, Source } from 'graphql'
import { Context } from './core'
import { denormalize, Denormalized } from './denorm'
import { Editor } from './edit'
import err from './error'
import { hasFields, isAst } from './is'
import CoreSchema, { features, groupByName, schema } from './schema'

export class Merge extends Denormalized {
  static concat(subgraphs: CoreSchema[]): Merge {
    return new Merge({
      kind: 'Document',
      definitions: subgraphs.flatMap(
        subgraph => subgraph.get(denormalize)
          .data.definitions
      )
    })
  }
}

export function federate(sources: Source[]) {
  return Merge
    .concat(sources.map(source =>
      CoreSchema.fromSource(source)
        .get(maybeAddingFederationBuiltins))
    )
    .edit(mergeDefinitions)
    .edit(editor => {
      for (const defs of editor.core.namedChildren.values()) {
        if (defs.length !== 1) continue
        if (!isAst(defs[0], 'ObjectTypeDefinition', 'InterfaceTypeDefinition')) continue
        editor.merge(groupByName(defs[0].fields ?? []), mergeFields(defs[0]))
      }
    })
}

export const ErrNoDefinition = (name: string, nodes: readonly DefinitionNode[]) =>
  err('NoDefinition', {
    message: `${name} does not have a definition`,
    nodes
  })

export const ErrAllExternal = (type: ASTNode & { name: NameNode }, fieldName: string, nodes: readonly FieldDefinitionNode[]) =>
  err('AllExternal', {
    message: `all definitions of ${type.name.value}.${fieldName} are external`,
    coordinate: `${type.name.value}.${fieldName}`,
    nodes
  })

const mergeFields = (parent: ASTNode & { name: NameNode, fields?: readonly FieldDefinitionNode[] }) =>
  (name: string, defs: readonly FieldDefinitionNode[], editor: Editor<Denormalized & Context>) => {
    if (defs.length === 1) return defs[0]
    const nonExternals = defs.filter(node =>
      [...editor.core.read('https://specs.apollo.dev/federation/external/v0.1', node)].length === 0
    )
    if (!nonExternals.length) editor.core.report(ErrAllExternal(parent, name, defs))
    return nonExternals[0]
  }

const mergeDefinitions = (editor: Editor<Denormalized & Context>) =>
  editor.merge(editor.core.namedChildren,
    (name: string, defs: readonly DefinitionNode[], editor: Editor<Denormalized & Context>) => {
      const ownDefs = defs.filter(def => def.kind.endsWith('Definition'))
      if (!ownDefs.length) editor.core.report(ErrNoDefinition(name, defs))
      if (!isAst(ownDefs[0], 'ObjectTypeDefinition', 'InterfaceTypeDefinition')) return
      return {
        ...ownDefs[0],
        fields: defs.flatMap(def => hasFields(def) ? def.fields : []),
      }
    })

function maybeAddingFederationBuiltins(this: CoreSchema & Context): CoreSchema {
  if (this.try(features))
    // if we are already a core schema, return ourselves
    return this
  if (this.try(schema)) {
    // if a schema definition already exists, append the core directive builtins to it
    const schemaDef = this.get(schema)
    return new CoreSchema({
      ...this.document,
      definitions: this.document.definitions.map(
          node =>
            node === schemaDef
              ? {
                ...schemaDef,
                directives: [
                  ...schemaDef.directives || [],
                  ...BUILTINS.directives || []
                ]
              } : node
      )
    })
  }

  // otherwise, prepend the schema definition containing federation builtins to the doc
  return new CoreSchema({
    ...this.document,
    definitions: [
      BUILTINS,
      ...this.document.definitions
    ]
  })
}

const BUILTINS = CoreSchema.fromSource(new Source(`
  schema
    @core(feature: "https://specs.apollo.dev/core/v0.2")
    @core(feature: "https://specs.apollo.dev/key/v0.1")
    @core(feature: "https://specs.apollo.dev/federation/requires/v0.1")
    @core(feature: "https://specs.apollo.dev/federation/provides/v0.1")
    @core(feature: "https://specs.apollo.dev/federation/external/v0.1")
  {
    query: Query
  }
`, '<builtin subgraph core>')).schema
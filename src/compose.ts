import { DocumentNode, Source, visit } from 'graphql'
import Core, { Immutable } from './core'
import { denormalize } from './denorm'
import CoreSchema, { CoreSchemaContext, features, schema } from './schema'

export function concat(subgraphs: Immutable<CoreSchema>[]): Core<DocumentNode> {
  return new Core({
    kind: 'Document',
    definitions: subgraphs.flatMap(
      subgraph => subgraph.get(denormalize)
        .data.definitions
    )
  })
}

export function federate(sources: Source[]) {
  return concat(sources.map(source =>
    CoreSchema.fromSource(source)
      .get(maybeAddingFederationBuiltins))
  )
}

function maybeAddingFederationBuiltins(this: CoreSchemaContext): Immutable<CoreSchema> {
  if (this.try(features))
    // if we are already a core schema, return ourselves
    return this as Immutable<CoreSchema>
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
  {
    query: Query
  }
`, '<builtin subgraph core>')).schema
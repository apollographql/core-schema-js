import ERR, { Err, siftResults } from './err'
import { parse as parseSchema, visit } from 'graphql'
import type { DocumentNode, SchemaDefinitionNode } from 'graphql'

import { asSource, AsSource, Source } from './source-map'
import { derive, set } from './data'
import { customScalar, Deserialized, metadata, obj, Str } from './metadata'
import { sourceOf, documentOf, pathOf } from './linkage'
import { Spec, spec } from './spec'
import { Must } from './is'

const ErrNoSchemas = ERR `NoSchemas` (() =>
  `no schema definition found`)

const ErrExtraSchema = ERR `ExtraSchema` (() =>
  `extra schema definition ignored`)

const ErrNoCore = ERR `NoCore` (() =>
  `@core(using: "${core}") directive required on schema definition`)

const ErrCoreSpecIdentity = ERR `NoCoreSpecIdentity` ((props: { got: string }) =>
  `the first @core directive must reference "${core.identity}", got: "${props.got}"`)


const ErrDocumentNotOk = ERR `DocumentNotOk` (() =>
  `one or more errors on document`)

/**
 * Document for source
 */
const document = derive <DocumentNode, Source>
  `Document for source` (src => link(parseSchema(src.text), src))

/**
 * Report one or more errors, linking them to the document.
 * 
 * @param errs
 */
export function report(...errs: Err[]) {  
  for (const err of errs) if (err.doc)
    errors(err.doc).push(err)
}

/**
 * Errors in this document
 */
export const errors = derive <Err[], DocumentNode>
  `Document errors` (() => [])

export class Schema {
  public static parse(...input: AsSource): Schema {
    return new Schema(asSource(input))
  }

  constructor(public readonly source: Source) { }

  get document() { return document(this.source) }
  get errors() { return errors(this.document) }
  get schema() { return schemaDef(this.document) }
  
  get using() { return using(this.document) }

  ok(): ValidSchema {
    // Bootstrap if we haven't already
    using(this.document)
    const err = errors(this.document)
    if (err.length)
      throw ErrDocumentNotOk({
        node: this.document,
        source: this.source
      }, ...err).toError()
    return this as ValidSchema
  }
}

export default Schema

export interface ValidSchema extends Schema {
  readonly schema: SchemaDefinitionNode
}

const addError = derive <(...err: Err[]) => void, DocumentNode>
  `Report a document error` (
    doc => {
      const src = sourceOf(doc)
      const docErrors = errors(doc)
      return (...errs: Err[]) => {
        for (const err of errs) {
          ;(err as any).source = src
          docErrors.push(err)
        }
      }
    })

/**
 * Attach a reference to the document from every node in the doc. These
 * links can be accessed via documentOf.
 *
 * @param doc
 */
function link(doc: DocumentNode, source: Source) {
  visit(doc, {
    enter(node, _key, _parent, path) {
      set(node, documentOf, doc)
      set(node, sourceOf, source)
      set(node, pathOf, [...path])
    }
  })
  return doc
}

const schemaDef =
  derive <SchemaDefinitionNode | undefined, DocumentNode>
    `The schema definition node` (doc => {
      let schema: SchemaDefinitionNode | undefined = void 0
      const report = addError(doc)
      for (const def of doc.definitions) {
        if (def.kind === 'SchemaDefinition') {
          if (!schema) {
            schema = def
            continue
          }
          const error = ErrExtraSchema({ doc, node: def })
          report(error)
        }
      }
      if (!schema) {
        const error = ErrNoSchemas({ doc })
        report(error)
      }
      return schema
    })


const core = spec `https://lib.apollo.dev/core/v0.1`

const bootstrapReq = obj({
  using: customScalar(Spec).must,
  as: Str
}).must

type Req = Must<Deserialized<typeof bootstrapReq>>

export const using =
  derive <Req[], DocumentNode>
  `Specs in use by this schema` (doc => {
    // Perform bootstrapping on the schema
    const schema = schemaDef(doc)
    if (!schema) return []

    // Try to deserialize every directive on the schema element as a
    // core.Using input.
    //
    // This uses the deserializer directly, not checking the name of the
    // directive. We need to do this during bootstrapping in order to discover
    // the name of @core within this document.
    const [errs, okays] = siftResults(
      (schema.directives ?? [])
        .filter(d => 'using' in metadata(d))
        .map(bootstrapReq.deserialize)
    )

    // Core schemas MUST reference the core spec as the first @core directive
    // on their schema element.
    //
    // Find this directive. (Note that this scan is more permissive than the spec
    // requires, allowing the @core(using:) dire)
    const coreReq = okays.find(r =>
      r.node && r.node.kind === 'Directive' &&
      r.node.name.value === (r.ok.as ?? core.name))
    const coreName = (coreReq?.ok.as ?? core.name)

    const report = addError(doc)

    if (!coreReq) {
      report(ErrNoCore({ doc, node: schema }))
      return []
    }

    const {ok: coreUse, node: directive} = coreReq

    if (coreUse.using.identity !== core.identity) {
      report(ErrCoreSpecIdentity({ doc, node: directive ?? schema, got: coreUse.using.identity }))
      return []
    }

    report(
      ...errs.filter(
        e => e.node?.kind === 'Directive' &&
        e.node.name.value === coreName)
    )
    return okays.map(r => r.ok)
  })

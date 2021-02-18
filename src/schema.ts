import type { DocumentNode, SchemaDefinitionNode } from 'graphql'
import type { AsSource, Source } from './source'

import ERR, { Err, siftResults } from './err'
import { parse as parseSchema, visit } from 'graphql'
import { source } from './source'
import { derive, get, Read, set } from './data'
import { sourceOf, documentOf, pathOf } from './linkage'
import { Spec, spec } from './spec'
import { Maybe } from './is'
import { Pipe } from './pipe'
import { customScalar, metadata, must, struct, Str, Bool } from './serde'

export const ErrNoSchemas = ERR `NoSchemas` (() =>
  `no schema definition found`)

export const ErrExtraSchema = ERR `ExtraSchema` (() =>
  `extra schema definition ignored`)

export const ErrNoCore = ERR `NoCore` (() =>
  `@core(using: "${core}") directive required on schema definition`)

export const ErrCoreSpecIdentity = ERR `NoCoreSpecIdentity` ((props: { got: string }) =>
  `the first @core directive must reference "${core.identity}", got: "${props.got}"`)

export const ErrDocumentNotOk = ERR `DocumentNotOk` (() =>
  `one or more errors on document`)

export default fromSource

/**
 * Helper for quickly creating a Pipe<DocumentNode> from a source. 
 * 
 * @param asSource 
 */
export function fromSource(...asSource: AsSource): Pipe<DocumentNode> {
  return Pipe.from(source(...asSource))
    .to(document)
    .to(attach(using))
}

/**
 * Document for source
 */
export const document = derive <DocumentNode, Source>
  ('Document for source', src => link(parseSchema(src.text), src))

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
  ('Document errors', () => [])

/**
 * Attach metadata layers to a document.
 * 
 * Calling this isn't required, but ensures that the provided layers are
 * scanned completely and any resulting errors are caught.
 * 
 * @param doc 
 */
export const attach = (...layers: Read<any, DocumentNode, any>[]) =>
  (doc: DocumentNode): DocumentNode => {
    layers.forEach(l => get(doc, l))
    return doc
  }

/**
 * Ensure that the document contains no errors. Returns the document
 * if successful, throws ErrDocumentNotOk otherwise.
 * 
 * @param doc
 */
export function ensure(doc: DocumentNode): DocumentNode {
  const errs = errors(doc)
  if (errs.length) {
    throw ErrDocumentNotOk({
      node: doc,
    }, ...errs).toError()
  }
  return doc
}

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

export const schemaDef =
  derive <SchemaDefinitionNode | undefined, DocumentNode>
    ('The schema definition node', doc => {
      let schema: SchemaDefinitionNode | undefined = void 0
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

type Req = {
  using: Spec,
  as: Maybe<string>,
  export: Maybe<boolean>,
}

export const using =
  derive <Req[], DocumentNode>
    ('Specs in use by this schema', doc => {    
      // Perform bootstrapping on the schema
      const schema = schemaDef(doc)
      if (!schema) return []

      const bootstrapReq = must(struct({
        using: must(customScalar(Spec)),
        as: Str,
        export: Bool,
      }))    

      // Try to deserialize every directive on the schema element as a
      // core.Using input.
      //
      // This uses the deserializer directly, not checking the name of the
      // directive. We need to do this during bootstrapping in order to discover
      // the name of @core within this document.
      const [errs, okays] = siftResults(
        (schema.directives ?? [])
          .filter(d => metadata(d).has('using'))
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

      if (!coreReq) {
        report(ErrNoCore({ doc, node: schema }))
        return []
      }

      const {ok: coreUse, node: directive} = coreReq

      if (coreUse.using.identity !== core.identity) {
        report(ErrCoreSpecIdentity({
          doc,
          node: directive ?? schema,
          got: coreUse.using.identity
        }))
        return []
      }

      report(
        ...errs.filter(
          e => e.node?.kind === 'Directive' &&
          e.node.name.value === coreName)
      )
      return okays.map(r => r.ok)
    })

import { ASTNode, DocumentNode, NameNode, visit } from 'graphql'
import { derive } from './data'
import { Maybe, isAst } from './is'
import { ensureDocumentOf } from './linkage'
import { using } from './schema'
import { Spec } from './spec'
import { surface } from './specs/core'
import { scan } from './scan'

class Namespace {
  constructor(
    public readonly name: string,
    public readonly spec: Spec,
    public readonly isExport: boolean) {}

  /**
   * Return the specified name of a name within the document.
   * 
   * For example, given these declarations:
   * 
   * ```graphql
   * schema @core(using: "https://lib.apollo.dev/core/v1.0")
   *   @core(using: "https://example.com/someSpec/v1.0", as: "otherName")
   * ```
   * 
   * Then:
   * 
   * ```
   * namespacesIn(doc).get('core').specifiedName('core__someName')
   *   // -> 'core__someName'
   * namespacesIn(doc).get('core').specifiedName('core')
   *   // -> 'core'
   * namespacesIn(doc).get('otherName').specifiedName('otherName__someName')
   *   // -> 'someSpec__someName'
   * namespacesIn(doc).get('otherName').specifiedName('otherName')
   *   // -> 'someSpec'
   * namespacesIn(doc).get('otherName').specifiedName('core')
   *   // -> null
   * namespacesIn(doc).get('core').specifiedName('badPrefix__something')
   *   // -> null
   * ```
   * 
   * @param name to demangle
   */
  specifiedName(nameInDoc: string): string | null {
    const [prefix, base] = getPrefix(nameInDoc)
    if (prefix) {
      if (prefix !== this.name) return null
      return `${this.spec.name}__${base}`
    }
    if (base !== this.name) return null
    return this.spec.name
  }
}

export const namespacesIn = derive(
  'Namespaces in document', (doc: DocumentNode) => {
    const names = new Map<string, Namespace>()
    for (const layer of using(doc)) {
      const name = layer.as ?? layer.using.name
      names.set(name, new Namespace(
        name,
        layer.using,
        !!layer.export,
      ))
    }
    return names
  })

export const namespaceOf = derive(
  'Namespace of this node', node => {
    if (!hasName(node)) return null
    const [prefix] = getPrefix(node.name.value)
    if (prefix || isAst(node, 'Directive', 'DirectiveDefinition')) {      
      return namespacesIn(ensureDocumentOf(node))
        .get(prefix ?? node.name.value)
    }
    return null
  })

export function namespaceFor(doc: DocumentNode, spec: Spec): Maybe<Namespace> {
  for (const ns of namespacesIn(doc).values()) {
    if (ns.spec && spec.satisfies(ns.spec))
      return ns      
  }
  return null
}

export const isExport = derive
  ('Is this node in the export schema?', node => {
    const [explicit] = scan(node, surface)
    if (explicit) return explicit.data.export
    const ns = namespaceOf(node)
    if (!ns || ns.isExport) return true
    return false
  })

export function exportSchema(doc: DocumentNode) {
  return visit(doc, {
    enter(node) {
      if (!isExport(node)) return null      
      return undefined
    }
  })
}

function getPrefix(name: string, sep = '__'): [string | null, string] {
  const idx = name.indexOf(sep)
  if (idx === -1) return [null, name]
  return [name.substr(0, idx), name.substr(idx + sep.length)]
}

const hasName = (node: any): node is ASTNode & { name: NameNode } =>
  isAst(node?.name, 'Name')
import { ASTNode, DocumentNode, NameNode, visit } from 'graphql'
import { derive } from './data'
import { Maybe, isAst } from './is'
import { ensureDocumentOf } from './linkage'
import { using } from './schema'
import { Spec } from './spec'
import core from './specs/core'

interface Namespace {
  name: string,
  spec?: Spec,
  export: boolean,
}

export const namespaces = derive <Map<string, Namespace>, DocumentNode>
  ('Namespaces in document', doc => {
    const names = new Map<string, Namespace>()
    for (const layer of using(doc)) {
      const name = layer.as ?? layer.using.name
      names.set(name, {
        name,
        spec: layer.using,
        export: !!layer.export,
      })
    }
    return names
  })

export const namespaceOf = derive<Maybe<Namespace>, ASTNode>
  ('Namespace of this node', node => {
    if (!hasName(node)) return null
    if (isAst(node, 'Directive', 'DirectiveDefinition') ||
      node.name.value.includes('__')) {
      const [prefix] = node.name.value.split('__')    
      return namespaces(ensureDocumentOf(node)).get(prefix)
    }
    return null
  })

export const isExport = derive<boolean, ASTNode>
  ('Is this node in the export schema?', node => {
    const [explicit] = core.Export(node)
    if (explicit) return explicit.export
    const ns = namespaceOf(node)
    if (!ns || ns.export) return true
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

const hasName = (node: any): node is ASTNode & { name: NameNode } =>
  isAst(node?.name, 'Name')
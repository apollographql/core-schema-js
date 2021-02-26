import type { ASTNode, DocumentNode } from 'graphql'
import type { Source } from './source'
import { derive } from './data'


export interface ASTNodeContext {
  readonly source: Source
  readonly document: DocumentNode
  readonly path: (string | number)[]
}
export const astNodeContextOf = derive('AST node context',
  (_: ASTNode): ASTNodeContext => ({} as ASTNodeContext));

/**
 * Source for document
 */
export const sourceOf = (node: ASTNode) => astNodeContextOf(node).source

/**
 * Document of node
 */
export const documentOf = (node: ASTNode) => astNodeContextOf(node).document

/**
 * Return the document of `node` or throw ErrNodeNotAttached.
 * 
 * @param node
 */
export function ensureDocumentOf(node: ASTNode): DocumentNode {
  const doc = documentOf(node)
  if (!doc) throw new NodeNotAttachedError(node)
  return doc
}

/**
 * Path to AST Node
 */
export const pathOf = (node: ASTNode) => astNodeContextOf(node).path

class NodeNotAttachedError extends Error {
  constructor(public readonly node: ASTNode) {
    super('node is not attached and must be for this operation')
  }
}
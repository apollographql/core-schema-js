import type { ASTNode, DocumentNode } from 'graphql'
import type { Source } from './source'
import { data } from './data'

/**
 * Source for document
 */
export const sourceOf = data <Source, any>
  `Source location`

/**
 * Document of node
 */
export const documentOf = data <DocumentNode, ASTNode>
  `Document for node`

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
export const pathOf = data <readonly (string | number)[], ASTNode>
  `Path to node`

class NodeNotAttachedError extends Error {
  constructor(public readonly node: ASTNode) {
    super('node is not attached and must be for this operation')
  }
}
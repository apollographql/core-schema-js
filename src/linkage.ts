import type { ASTNode, DocumentNode } from 'graphql'
import { data } from './data'
import ERR from './err'
import type { Source } from './source'

export const ErrNodeNotAttached = ERR `NodeNotAttached` (() =>
  `node isn't attached to document, and must be for this operation`)

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
  if (!doc) throw ErrNodeNotAttached({ node }).toError()
  return doc
}

/**
 * Path to AST Node
 */
export const pathOf = data <readonly (string | number)[], ASTNode>
  `Path to node`
import type { ASTNode, DocumentNode } from "graphql"
import { data } from "./data"
import type { Source } from "./source-map"

/**
 * Source for document
 */
export const sourceOf = data <Source, any> `Source location`

/**
 * Document of node
 */
export const documentOf = data <DocumentNode, ASTNode>
  `Document for node`


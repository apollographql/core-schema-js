import { DocumentNode, visit } from "graphql"

const NODE_PATH = Symbol('path to node')

export const pathOf = (node: any): (string | number)[] | null =>
  (node && Array.isArray(node[NODE_PATH])) ? node[NODE_PATH] : null

export function addPaths(doc: DocumentNode) {
  visit(doc, {
    enter(node, _key, _parent, path) {
      (node as any)[NODE_PATH] = [...path]
    }
  })
}
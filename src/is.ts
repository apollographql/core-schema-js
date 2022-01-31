/*** ast-specific ***/
import type { ASTKindToNode, ASTNode } from 'graphql'

export function isAst<K extends ASTNode["kind"]>(obj: any, ...kinds: K[]): obj is ASTKindToNode[K] {
  return kinds.indexOf(obj?.kind) !== -1
}

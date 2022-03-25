/*** ast-specific ***/
import { type ASTKindToNode, type ASTNode, Kind, type NameNode } from 'graphql'

export function isAst<K extends ASTNode["kind"] = ASTNode["kind"]>(obj: any, ...kinds: K[]): obj is ASTKindToNode[K] {
  if (!kinds.length)
    return typeof obj?.kind === 'string'
  return kinds.indexOf(obj?.kind) !== -1
}

export const hasName = <T>(o: T): o is T & { name: NameNode } =>
  o && isAst((o as any).name, Kind.NAME)

export type Template = Parameters<typeof String.raw>

const knownTemplates = new WeakSet
export const isTemplate = (args: any[]): args is Template =>
  knownTemplates.has(args) || !!(
    Array.isArray(args[0]) &&
    args[0].every(x => typeof x === 'string') &&
    args[0].length === args.length &&
    knownTemplates.add(args[0])
  )

export const isAsString = (args: any[]): args is AsString =>
    isTemplate(args) || (args.length === 1 && typeof args[0] === 'string')

export type AsTemplateOr<T> = Template | [T]
export type AsString = AsTemplateOr<string>

export function asString<I extends any[]>(input: I): (I extends AsString ? string : undefined) {
  return (
    !isAsString(input)
      ? undefined
      :
    isTemplate(input)
      ? String.raw(...input as Template)
      : input[0]
  ) as (I extends AsString ? string : undefined)
}

// Length-asserting array helpers
export function isNonEmpty<T>(input: T[]): input is [T, ...T[]] {
  return !isEmpty(input)
}

export function isEmpty<T>(input: T[]): input is [] {
  return !input.length
}

/*** ast-specific ***/
import type { ASTKindToNode, ASTNode, DirectiveNode, NameNode } from 'graphql'

export function isAst<K extends ASTNode["kind"]>(obj: any, ...kinds: K[]): obj is ASTKindToNode[K] {
  return kinds.indexOf(obj?.kind) !== -1
}

export const hasName = (node: any): node is ASTNode & { name: NameNode } =>
  isAst(node?.name, 'Name')
  
export const hasDirectives = (node: any): node is ASTNode & { directives: DirectiveNode[] } =>
  Array.isArray(node?.directives)

export type Maybe<T> = T | null | undefined
export type Must<T> = Exclude<T, null | undefined>

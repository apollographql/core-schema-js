import { type ASTNode, print as printNode } from 'graphql'
import { hasRef } from '../de'

/**
 * Serialize AST nodes as a snippet of the source.
 * 
 * This keeps snapshots more readable, as AST nodes typically have a whole
 * subtree attached to them.
 */
export const test = (val: any) => typeof val.kind === 'string'
export const print = (val: ASTNode) => {
  if (!val.loc) return '[synth] ' + printNode(val)
  const {loc} = val
  const {line} = loc.startToken
  let start = loc.startToken
  let end = loc.startToken
  while (start.prev && start.prev.line === line)
    start = start.prev
  while (end.next && end.next.line === line)
    end = end.next
  const text = val.loc.source.body.substring(start.start, end.end)
  const hgref = hasRef(val)
    ? `<${val.hgref?.toString() ?? ''}>`
    : ''
  const col = loc.startToken.start - start.start
  const head = text.substring(0, col)
  const tail = text.substring(col)
  return `${hgref}[${val.loc.source.name}] ${head}👉${tail}`
}


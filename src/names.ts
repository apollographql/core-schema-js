import type { ASTNode, NameNode } from 'graphql'

export type LinkPath = [string | null, string]

export function getPrefix(name: string, sep = '__'): LinkPath {
  const idx = name.indexOf(sep)
  if (idx === -1) return [null, name]
  return [name.substr(0, idx), name.substr(idx + sep.length)]
}

export function toPrefixed(path: LinkPath): string {
  if (path[0] == null) return path[1]
  return path[0] + '__' + path[1]
}

export function scopeNameFor(
  node: { kind: ASTNode["kind"], name?: NameNode },
  name = node.name?.value
) {
  if (node.kind === 'Directive' || node.kind === 'DirectiveDefinition')
    return '@' + (name ?? '')
  return name ?? ''
}

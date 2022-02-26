import type { ASTNode, NameNode } from 'graphql'

export function getPrefix(name: string, sep = '__'): [string | null, string] {
  const idx = name.indexOf(sep)
  if (idx === -1) return [null, name]
  return [name.substr(0, idx), name.substr(idx + sep.length)]
}

export function scopeNameFor(
  node: { kind: ASTNode["kind"], name: NameNode },
  name = node.name.value
) {
  if (node.kind === 'Directive' || node.kind === 'DirectiveDefinition')
    return '@' + name
  return name
}

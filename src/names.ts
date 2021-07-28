export function getPrefix(name: string, sep = '__'): [string | null, string] {
  const idx = name.indexOf(sep)
  if (idx === -1) return [null, name]
  return [name.substr(0, idx), name.substr(idx + sep.length)]
}
  
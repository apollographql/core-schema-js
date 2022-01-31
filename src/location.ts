import recall, { use } from '@protoplasm/recall'
import { ASTNode, NameNode } from 'graphql'
import { URL } from 'url'
import Version from './version'

export class LinkUrl {
  static from(input: string | LinkUrl) {
    if (typeof input === 'string') return this.parse(input)
    return input
  }

  static parse(input: string) {
    const url = new URL(input)
    const path = url.pathname ?? ''
    const parts = rsplit(path, '/')

    // the last two path components are (name)/(name or version)
    const [nameVerPart, namePart] = [
      parts.next().value ?? undefined,
      parts.next().value ?? undefined
    ]
    const version = Version.parse(nameVerPart)
    const name = version ? parseName(namePart) : parseName(nameVerPart)

    // clear out unused url components
    url.search = ''
    url.password = ''
    url.username = ''
    url.hash = ''
    return this.canonical(url.href, name ?? undefined, version ?? undefined)
  }

  public readonly type: 'schema' = 'schema'

  get graph() { return this }

  locateDirective(name?: string): Loc {
    return directive(name ?? '', this)
  }

  locateType(name: string): ElementLocation {
    return type(name, this)
  }

  @use(recall)
  private static canonical(href: string, name?: string, version?: Version): LinkUrl {
    return new this(href, name, version)
  }

  private constructor(
    public readonly href: string,
    public readonly name?: string,
    public readonly version?: Version) {}
}

export default LinkUrl

export interface ReferenceNode {
  kind: ASTNode["kind"]
  name: NameNode
}

export interface ElementLocation {
  readonly type: 'type' | 'directive'
  readonly graph?: LinkUrl
  readonly name: string
}

export type Loc = LinkUrl | ElementLocation

const element = recall(
  function element(type: 'type' | 'directive', name: string, graph?: LinkUrl): ElementLocation {
    return { type, name, graph }
  }
)

export const type = (name: string, graph?: LinkUrl | string) =>
  element('type', name, graph ? LinkUrl.from(graph) : undefined)

export const directive = (name: string, graph?: LinkUrl | string) =>
  element('directive', name, graph ? LinkUrl.from(graph) : undefined)


function *rsplit(haystack: string, sep: string) {
  let index = haystack.lastIndexOf(sep)
  const len = haystack.length
  const sepLen = sep.length
  let lastIndex = len
  while (index !== -1 && lastIndex > 0) {
    yield haystack.substring(index + sepLen, lastIndex)
    lastIndex = index
    index = haystack.lastIndexOf(sep, index - 1)
  }
  yield haystack.substring(0, lastIndex)
}

const NAME_RE = /^[a-zA-Z0-9\-]+$/
function parseName(name: string | null | void): string | null {
  if (!name) return null
  if (!NAME_RE.test(name)) return null
  if (name.startsWith('-') || name.endsWith('-')) return null
  return name
}

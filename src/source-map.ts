import type { Location, ASTNode } from 'graphql'
import search from 'binarysearch'
import { Maybe, asString, AsString, isAsString, isEmpty } from './is'

export interface Source {
  /// The filename or URL of this source
  src: string

  /// The text of the source
  text: string
}

export interface SourceMap {
  (from?: Location | ASTNode): string
}

export type AsSource = AsString | [Source]

export function asSource(source: AsSource): Source {
  if (isAsString(source)) return {
    src: '<anonymous>',
    text: asString(source)
  }

  return source[0]
}

const isNode = (o: any): o is ASTNode => typeof o?.kind === 'string'
const locationFrom = (from?: Location | ASTNode): Maybe<Location> =>
  (from && isNode(from)) ? from.loc : from

export default function sourceMap(...input: AsSource | [undefined] | []): SourceMap {
  if (isEmpty(input) || !input[0]) return nullMap
  const source = asSource(input)
  const { src, text } = source
  const endings = [...indexesOf(text)]

  return describe

  function describe(from?: Location | ASTNode) {
    const loc = locationFrom(from)
    if (!loc) return `${src}:[unknown]`
    const line = search.closest(endings, loc.start)
    const col = loc.start - endings[line]
    return `${src}:${line + 1}:${col}`
  }
}

function *indexesOf(text: string, substr='\n') {
  let offset = 0
  while ((offset = text.indexOf(substr, offset)) !== -1) {
    yield offset
    offset += substr.length
  }
}

const nullMap: SourceMap = (loc?: Location | ASTNode) =>
  loc
    ? `<unknown source>[offset ${locationFrom(loc)?.start}]`
    : `<unknown source>[unknown]`

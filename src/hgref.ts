import recall from '@protoplasm/recall'
import { Maybe } from 'graphql/jsutils/Maybe'
import LinkUrl from './location'

export interface SchemaRef {
  readonly refKind: 'schema'
  readonly name: undefined
  readonly graph?: LinkUrl
}

export interface ElementRef {
  readonly refKind: 'named' | 'directive'
  readonly name: string
  readonly graph?: LinkUrl
}

export type HgRef = SchemaRef | ElementRef

const hgref = recall(
  function hgref<K extends HgRef["refKind"]>(refKind: K, name: HgRef["name"], graph: HgRef["graph"]): HgRef & { refKind: K } {
    return Object.freeze({ refKind, name, graph }) as HgRef & { refKind: K }
  }
)

export const named = (name: string, graph?: LinkUrl | string): ElementRef =>
  hgref('named', name, graph ? LinkUrl.from(graph) : undefined)

export const directive = (name: string, graph?: LinkUrl | string): ElementRef =>
  hgref('directive', name, graph ? LinkUrl.from(graph) : undefined)

export const rootDirective = (graph?: LinkUrl | string): ElementRef =>
  directive('', graph)

export const schema = (graph: LinkUrl | string): SchemaRef =>
  hgref('schema', undefined, graph ? LinkUrl.from(graph) : undefined)

export function withGraph<T extends HgRef>(ref: T, graph?: LinkUrl): T {
  return hgref(ref.refKind, ref.name, graph ? LinkUrl.from(graph) : undefined) as T
}

export function asDirective<T extends HgRef>(ref: T): Maybe<ElementRef> {
  if (ref.refKind === 'directive') return ref
  if (ref.refKind === 'schema') return rootDirective(ref.graph)
  return null
}

import recall, { use } from '@protoplasm/recall'
import LinkUrl from './location'

export type TermKind = 'name' | 'directive' | 'schema'
export class Term<K extends TermKind = TermKind> {
  static named<N extends string>(name: N): NameTerm {
    return this.canon('name', name) as NameTerm
  }

  static directive(name?: string): Term<'directive'> {
    return this.canon('directive', name ?? '')
  }

  static schema(name?: string): Term<'schema'> {
    return this.canon('schema', name ?? '')
  }

  @use(recall)
  static canon<K extends TermKind>(elKind: K, name: string): Term<K> {
    return new Term(elKind, name)
  }

  toString() {
    if (this.name == null) return ''
    if (this.termKind === 'name')
      return '#' + this.name
    if (this.termKind === 'directive')
      return '#@' + this.name
    return `#${this.termKind}-${this.name}`
  }

  private constructor(
    public readonly termKind: K,
    public readonly name: string,
  ) {}
}

export type SchemaRoot = Term<'schema'> & { name: '' }
export type NameTerm = Term<'name'> & { name: string }

export class HgRef<T extends Term = Term> {
  @use(recall)
  static canon<T extends Term>(element: T, graph?: LinkUrl): HgRef<T> {
    return new this(element, graph)
  }

  static directive(name: string, graph?: LinkUrl | string) {
    return this.canon(Term.directive(name), LinkUrl.from(graph))
  }

  static rootDirective(graph?: LinkUrl | string) {
    return this.directive('', graph)
  }

  static named(name: string, graph?: LinkUrl | string) {
    return this.canon(Term.named(name), LinkUrl.from(graph))
  }

  static graph(graph: LinkUrl | string): HgRef<SchemaRoot> {
    return this.canon(Term.schema(), LinkUrl.from(graph)) as HgRef<SchemaRoot>
  }

  setGraph(graph?: LinkUrl | string) {
    return HgRef.canon(this.element, LinkUrl.from(graph))
  }

  setTerm<T extends Term>(element: T): HgRef<T> {
    return HgRef.canon(element, this.graph)
  }

  toString() {
    return (this.graph?.href ?? '') + this.element.toString()
  }

  constructor(public readonly element: T, public readonly graph?: LinkUrl) {}
}

// export const named = (name: string, graph?: LinkUrl | string) =>
//   HgRef.named(name, graph)

// export const directive = (name: string, graph?: LinkUrl | string) =>
//   HgRef.directive(name, graph)

// export const rootDirective = (graph?: LinkUrl | string) =>
//   HgRef.directive('', graph)



// export function asDirective<T extends HgRef>(ref: T): Maybe<ElementRef> {
//   if (ref.refKind === 'directive') return ref
//   if (ref.refKind === 'schema') return rootDirective(ref.graph)
//   return null
// }

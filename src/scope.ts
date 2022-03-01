import { Kind } from 'graphql'
import { type Link } from './bootstrap'
import HgRef from './hgref'
import { isAst } from './is'
import LinkUrl from './location'
import { getPrefix, scopeNameFor } from './names'
import { Locatable } from './schema'
import ScopeMap from './scope-map'

/**
 * Scopes link local names to global graph locations.
 */
export interface IScope {
  readonly url?: LinkUrl
  readonly self?: Link
  own(name: string): Link | undefined
  lookup(name: string): Link | undefined
  visible(): Iterable<[string, Link]>
  entries(): Iterable<[string, Link]>
  locate(node: Locatable): HgRef
  child(fn: (scope: IScopeMut) => void): Readonly<IScope> 
}

export interface IScopeMut extends IScope {
  add(link: Link, name?: string): void
}

export class Scope implements IScope {
  static readonly EMPTY = this.create()

  static create(fn?: (scope: IScopeMut) => void, parent?: Scope): Readonly<Scope> {
    const child = new this(parent)
    if (fn) fn(child as any as IScopeMut)
    return Object.freeze(child)
  }

  get self() { return this.names.lookup('') }

  get url() { return this.self?.hgref.graph }

  locate(node: Locatable): HgRef {
    if (isAst(node, Kind.SCHEMA_DEFINITION, Kind.SCHEMA_EXTENSION)) {
      return HgRef.schema(this.url)
    }
    const [ prefix, name ] = getPrefix(node.name.value)    
    
    if (prefix) {
      const found = this.lookup(prefix)
      if (found) return HgRef.canon(scopeNameFor(node, name), found.hgref.graph)
    }

    // if there was no prefix OR the prefix wasn't found,
    // treat the entire name as a local name
    //
    // this means that prefixed__Names will be interpreted
    // as local names if and only if the prefix has not been `@link`ed 
    //
    // this allows for universality — it is always possible to represent
    // any api with a core schema by appropriately selecting link names
    // with `@link(as:)` or `@link(import:)`, even if the desired
    // api contains double-underscored names (odd choice, but you do you)
    return this.lookup(scopeNameFor(node))?.hgref ?? HgRef.canon(scopeNameFor(node), this.url)
  }

  own(name: string) { return this.names.own(name) }
  lookup(name: string) { return this.names.lookup(name) }
  visible() { return this.names.visible() }
  entries() { return this.names.entries() }

  child(fn: (scope: IScopeMut) => void): Readonly<IScope> {
    return Scope.create(fn, this)
  }

  //@ts-ignore — accessible via IScopeMut
  private add(link: Link, name = link.name): void {
    this.names.set(name, link)
  }

  private readonly names: ScopeMap<string, Link> = new ScopeMap(this.parent?.names)

  private constructor(public readonly parent?: Scope) {}
}

export default Scope
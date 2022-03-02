import recall, { use } from '@protoplasm/recall'
import { ASTNode, Kind, visit } from 'graphql'
import { Linker, type Link } from './bootstrap'
import { De, Def, Defs, isLocatable, isLocated, Locatable, Located } from './de'
import HgRef from './hgref'
import { isAst, hasName } from './is'
import LinkUrl from './location'
import { getPrefix, scopeNameFor, toPrefixed } from './names'
import ScopeMap from './scope-map'

/**
 * Scopes link local names to global graph locations.
 */
export interface IScope extends Iterable<Link> {
  readonly url?: LinkUrl
  readonly self?: Link
  readonly parent?: IScope
  readonly linker?: Linker
  
  own(name: string): Link | undefined
  has(name: string): boolean
  lookup(name: string): Link | undefined
  visible(): Iterable<[string, Link]>
  entries(): Iterable<[string, Link]>
  locate(node: Locatable): HgRef
  rLocate(node: Located): [string | null, string] | undefined
  denormalize<T extends ASTNode>(node: T): De<T>
  renormalizeDefs(defs: Defs): Iterable<Def>
  child(fn: (scope: IScopeMut) => void): Readonly<IScope>  
}

export interface IScopeMut extends IScope {
  add(link: Link, name?: string): void
}

export class Scope implements IScope {
  static readonly EMPTY = this.create()

  static create(fn?: (scope: IScopeMut) => void, parent?: Scope): IScope {
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
    const [ prefix, name ] = getPrefix(node.name?.value ?? '')
    
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

  rLocate(node: Located): [string | null, string] | undefined {
    const bareName = this.reverse.lookup(node.hgref)
    if (bareName) return [null, bareName]

    const prefix = this.reverse.lookup(node.hgref.setName(''))
    if (prefix) return [prefix, node.hgref.name]

    return
  }
  
  @use(recall)
  denormalize<T extends ASTNode>(node: T): De<T> {
    const self = this
    return visit(node, {
      enter<T extends ASTNode>(node: T, _: any, ): De<T> | undefined {
        if (isAst(node, Kind.INPUT_VALUE_DEFINITION)) return
        if (isLocatable(node)) {
          return { ...node, hgref: self.locate(node) } as De<T>
        }
        return
      }
    }) as De<T>
  }

  @use(recall)
  renormalize<T extends ASTNode>(node: De<T>): T {
    const self = this
    return visit(node, {
      enter<T extends ASTNode>(node: T, _: any, ): T | null | undefined {
        if (isAst(node, Kind.INPUT_VALUE_DEFINITION)) return
        if (!hasName(node) || !isLocated(node)) return
        const path = self.rLocate(node)
        if (!path) return
        return {
          ...node,
          name: { ...node.name, value: toPrefixed(path) }
        }
      }
    }) as T
  }

  *renormalizeDefs(defs: Defs): Iterable<Def> {
    for (const def of defs)
      yield this.renormalize(def)
  }

  *[Symbol.iterator]() {
    for (const ent of this.entries()) yield ent[1]
  }

  own(name: string) { return this.names.own(name) }
  has(name: string) { return this.names.has(name) }
  hasOwn(name: string) { return this.names.hasOwn(name) }
  lookup(name: string) { return this.names.lookup(name) }
  visible() { return this.names.visible() }
  entries() { return this.names.entries() }

  child(fn?: (scope: IScopeMut) => void): IScope {
    return Scope.create(fn, this)
  }

  clone(fn?: (scope: IScopeMut) => void): IScope {
    return Scope.create(scope => {
      for (const [name, link] of this.entries())
        scope.add(link, name)
      if (fn) fn(scope)
    }, this.parent)
  }

  get linker() {
    for (const [_, link] of this.visible()) {
      if (link.linker) return link.linker
    }
    return
  }

  //@ts-ignore — accessible via IScopeMut
  private add(link: Link, name = link.name): void {
    this.names.set(name, link)
    this.reverse.set(link.hgref, name)
  }

  private readonly names: ScopeMap<string, Link> = new ScopeMap(this.parent?.names)
  private readonly reverse: ScopeMap<HgRef, string> = new ScopeMap(this.parent?.reverse)

  private constructor(public readonly parent?: Scope) {}
}

export default Scope

/**
 * Return a Scope mutation which includes links to the provided
 * refs.
 * 
 * This can be used with scope.child, scope.clone, or Scope.create:
 * 
 * ```typescript
 * const scope = Scope.create(including(someRefs))
 * ```
 * 
 * The resulting Scope will be able to rLocate all refs
 * provided.
 * 
 * @param refs 
 */
export const including = (refs: Iterable<Located>) => (scope: IScopeMut) => {
  for (const ref of refs) {
    const graph = ref.hgref.graph
    if (!graph) continue
    const found = scope.rLocate(ref)
    if (found) continue
    for (const name of graph.suggestNames()) {
      if (scope.has(name)) continue
      scope.add({
        name, hgref: ref.hgref.setName('')
      })
      break
    }
  }
}
import recall, { use } from '@protoplasm/recall'
import { ASTNode, Kind, visit } from 'graphql'
import { Linker, type Link } from './linker'
import { De, Def, Defs, hasRef, isLocatable, isLocated, Locatable, Located } from './de'
import GRef from './hgref'
import { isAst, hasName } from './is'
import LinkUrl from './link-url'
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
  readonly flat: IScope

  own(name: string): Link | undefined
  has(name: string): boolean
  lookup(name: string): Link | undefined
  visible(): Iterable<[string, Link]>
  entries(): Iterable<[string, Link]>
  header(): Defs
  locate(node: Locatable): GRef
  rLocate(node: Located): [string | null, string] | undefined
  denormalize<T extends ASTNode>(node: T): De<T>
  renormalizeDefs(defs: Defs): Iterable<Def>
  child(fn: (scope: IScopeMut) => void): Readonly<IScope>
}

export interface IScopeMut extends IScope {
  add(link: Link): void
}

export class Scope implements IScope {
  static readonly EMPTY = this.create()

  static create(fn?: (scope: IScopeMut) => void, parent?: Scope): IScope {
    const child = new this(parent)
    if (fn) fn(child as any as IScopeMut)
    return Object.freeze(child)
  }

  get self() { return this.names.lookup('') }

  get url() { return this.self?.gref.graph }

  locate(node: Locatable): GRef {
    if (hasRef(node)) return node.gref
    
    if (isAst(node, Kind.SCHEMA_DEFINITION, Kind.SCHEMA_EXTENSION)) {
      return GRef.schema(this.url)
    }
    const [ prefix, name ] = getPrefix(node.name?.value ?? '')

    if (prefix) {
      // a prefixed__Name
      const found = this.lookup(prefix)
      if (found) return GRef.canon(scopeNameFor(node, name), found.gref.graph)
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
    return this.lookup(scopeNameFor(node))?.gref ?? GRef.canon(scopeNameFor(node), this.url)
  }

  header(): Defs {
    const directives = [...this.linker?.synthesize(this) ?? []]
    if (directives.length) {
      return [{ kind: Kind.SCHEMA_EXTENSION, directives, gref: GRef.schema(this.url) }]
    }
    return []
  }

  rLocate(node: Located): [string | null, string] | undefined {
    const bareName = this.reverse.lookup(node.gref)
    if (bareName) return [null, bareName]

    const prefix = this.reverse.lookup(node.gref.setName(''))
    if (prefix) return [prefix, node.gref.name]

    return
  }

  @use(recall)
  denormalize<T extends ASTNode>(node: T): De<T> {
    const self = this
    return visit(node, {
      enter<T extends ASTNode>(node: T, _: any, ): De<T> | undefined {
        if (isAst(node, Kind.INPUT_VALUE_DEFINITION)) return
        if (isLocatable(node)) {
          return { ...node, gref: self.locate(node) } as De<T>
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

  get flat() {
    return Scope.create(scope => {
      for (const [_, link] of this.visible())
        scope.add(link)
    })
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
      for (const [_, link] of this.entries())
        scope.add(link)
      if (fn) fn(scope)
    }, this.parent)
  }

  get linker() {
    for (const [_, link] of this.visible()) {
      if (link.linker) return Linker.bootstrap(link.linker)
    }
    return
  }

  //@ts-ignore — accessible via IScopeMut
  private add(link: Link): void {
    this.names.set(link.name, link)
    this.reverse.set(link.gref, link.name)
  }

  private readonly names: ScopeMap<string, Link> = new ScopeMap(this.parent?.names)
  private readonly reverse: ScopeMap<GRef, string> = new ScopeMap(this.parent?.reverse)

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
    const graph = ref.gref.graph
    if (!graph) continue
    const found = scope.rLocate(ref)
    if (found) continue
    for (const name of graph.suggestNames()) {
      if (scope.has(name)) continue
      scope.add({
        name, gref: ref.gref.setName('')
      })
      break
    }
  }
}

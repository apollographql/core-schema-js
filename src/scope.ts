import recall, { replay, report, use } from '@protoplasm/recall'
import { ASTNode, DefinitionNode, DirectiveNode, DocumentNode, Kind, NameNode, visit } from 'graphql'
import { Maybe } from 'graphql/jsutils/Maybe'
import defaultBootstrap, { id, Linker } from './bootstrap'
import directives from './directives'
import { isAst } from './is'
import { directive, LinkUrl, Loc, type, ElementLocation } from './location'

/**
 * `Scope`s map local names to global graph locations.
 * 
 * Scopes are multimaps: a given name may be mapped to multiple locations.
 * This allows Scopes to represent both strictly valid core schemas, and
 * invalid core schemas.
 */
export interface IScope {
  /**
   * Definitions in this Scope.
   */
  readonly root?: DocumentNode

  /**
   * The self link. This is a Link which allows the scope to refer
   * to itself.
   */
  readonly self?: Link<LinkUrl>

  /**
   * Iterate outbound links declared on this scope
   */
  links(): Iterable<Link>

  /**
   * Resolve a ReferenceNode to exactly one location. Returns
   * undefined if the node resolves to zero or more than one location.
   * 
   * @param node 
   */
  location(node: ReferenceNode): Maybe<Loc>

  /**
   * Iterate over all locations a ReferenceNode is bound to.
   * 
   * @param node 
   */
  locations(node: ReferenceNode): Iterable<Loc>

  /**
   * Create and return a child scope.
   * 
   * The child scope will be able to reference all links from the parent
   * scope (this one). Names linked in the child will shadow links in the
   * parent, as per the usual rules of lexical shadowing.
   * 
   * @param createFn 
   */
  child<F extends CreateFn>(createFn: F): Scope

  /**
   * Return a bound matcher. Matchers are functions which take ReferenceNodes
   * and return true if the node matches the location.
   * 
   * @param element the ElementLocation to match
   */
  matcher(element: ElementLocation): (node: ReferenceNode) => boolean

  ownNodes(loc: Loc): Nodes

  /**
   * Return a Linker for the given DirectiveNode.
   * 
   * This is mostly used during bootstrapping.
   * 
   * @param dir the directive in question
   * @param bootstrap 
   */
  linkerFor(dir: DirectiveNode,
    bootstrap?: (node: DirectiveNode) => Maybe<Linker>): Maybe<Linker>
}

export type CreateFn = (mut: IScopeMut) => any
export interface IScopeMut extends IScope {
  add(link: Link): this
  setSelf(link: Link): this
}

export interface Link<L extends Loc = Loc> {
  name: string
  location: L
  via: DirectiveNode
}

/**
 * A ReferenceNode is any ASTNode with a name.
 */
export interface ReferenceNode {
  kind: ASTNode["kind"]
  name: NameNode
}

const hasName = <T>(o: T): o is T & ReferenceNode =>
  o && isAst((o as any).name, Kind.NAME)


export const fromDoc = recall(
  (doc: DocumentNode) => (scope: IScopeMut) => {
    for (const dir of directives(doc)) {
      const linker = scope.linkerFor(dir)
      if (!linker) continue
      for (const link of linker(dir)) {
        scope.add(link)
      }
    }
    for (const dir of directives(doc)) {
      const self = id(scope, dir)
      if (self) {
        scope.add(self)
        scope.setSelf(self)
      }
    }
    return doc
  }
)

export class Scope implements IScope {
  public static readonly Empty = new this()

  public static create<F extends CreateFn>(fn: F): IScope {
    return Scope.Empty.child(fn)
  }

  // the root is set with the createfn's return value
  public readonly root?: DocumentNode
  public readonly self?: Link<LinkUrl>

  linkerFor(dir: DirectiveNode, bootstrap = defaultBootstrap) {
    const self = bootstrap(dir)
    if (self) return self
    const others = this._links[dir.name.value]
    if (!others || others.length !== 1) return
    return bootstrap(others[0].via)
  }

  private constructor(private readonly parent?: Scope) {}

  location(node: ReferenceNode): Maybe<Loc> {
    const i = this.locations(node)[Symbol.iterator]()
    const {done, value} = i.next()
    if (done) return value
    if (i.next().done) return value
    return
  }

  *locations(node: ReferenceNode): Iterable<Loc> {
    const [ prefix, name ] = getPrefix(node.name.value)    
    const { _links: links } = this
    let bound: Loc | null = null
    if (!prefix && links[name]) {
      const found = links[name]
      for (const link of found) {
        bound = bind(node, link.location)
        if (bound) yield bound
      }
    }

    if (prefix && links[prefix]) {
      const found = links[prefix]
      for (const link of found) {
        bound = bind(node, link.location, name)
        if (bound) yield bound        
      }
    }
    
    if (!bound) yield node.kind === 'Directive'
      ? directive(node.name.value, this.self?.location)
      : type(node.name.value, this.self?.location)
  }

  ownNodes(loc: Loc): Nodes {
    const self = this.self?.location
    console.log('lookup', self, loc)
    if (self && loc.type !== 'schema' && !loc.graph) {
      return this.ownNodes({ ...loc, graph: self })
    }
    const found = this.defsByLocation.get(loc)
    if (!found) return Nodes.Empty
    return Nodes.from(this.globalizeEach(found))
  }

  child<F extends CreateFn>(createFn: F): Scope {
    const child = new Scope(this)    
    // we're writing child.definitions, which is declared readonly
    // we just do it this once though, promise ;)
    //@ts-ignore
    child.root = createFn(child)
    Object.freeze(child._links)
    return child
  }

  @use(recall)
  matcher(element: ElementLocation) {
    return (node: ReferenceNode) => {
      for (const loc of this.locations(node))
        if (loc === element) return true
      return false
    }
  }

  *links() {
    const {_links: links} = this
    for (const name of Object.keys(links)) {
      for (const link of links[name])
        yield link
    }
  }
  private _links: Links = Object.create(this.parent?._links ?? null)

  @use(recall)
  get defsByLocation(): Map<Loc, DefinitionNode[]> {
    if (!this.root?.definitions) return new Map
    const defs = new Map<Loc, DefinitionNode[]>()
    for (const def of this.root.definitions) if (hasName(def))
      for (const loc of this.locations(def)) {
        const existing = defs.get(loc)
        if (existing) existing.push(def)
        else defs.set(loc, [def])
      }
    return defs
  }

  @use(replay)
  private *globalizeEach<T extends ASTNode>(defs: Iterable<T>): Iterable<De<T>> {
    for (const def of defs) yield this.globalize(def)
  }

  @use(recall)
  globalize<T extends ASTNode>(node: T): De<T> {
    return visit(node, {
      enter: (node: ASTNode) => this.globalizeNode(node)
    }) as De<T>
  }

  @use(recall)
  private globalizeNode<T extends ASTNode>(node: T): T & Global {
    const href =
      (node === this.root)
        ? this.self?.location
        :
      hasName(node)
        ? this.location(node)
        : undefined

    return { ...node, href }
  }

  //@ts-ignore unused — available via IScopeMut
  private add(link: Link): this {
    const {name} = link
    const {_links: links} = this
    if (!Object.getOwnPropertyDescriptor(links, name)) {
      links[name] = [link]
      return this
    }
    links[name].push(link)  
    return this
  }

  //@ts-ignore unused — available via IScopeMut
  private setSelf(link: Link) {
    (this as any).self = link
    return this
  }
}

export default Scope

interface Global {
  href: Maybe<Loc>
}

// type De<T> =
//   T extends (infer E)[]
//     ? De<E>[]
//     :
//   T extends Locatable
//     ? Global & {
//       [K in keyof T]:
//         K extends 'kind'
//           ? T[K]
//           : De<T[K]>
//     }
//     :
//   never

interface INodes<T> extends Iterable<T> {

}

class Nodes<T = any> implements INodes<T> {
  static readonly Empty = this.from<never>([])

  @use(recall)
  static from<T>(items: Iterable<T>): Nodes<T> {
    return new this(items)
  }

  private constructor(private readonly items: Iterable<T>) {}

  @use(recall)
  get array(): readonly T[] {
    return Object.freeze([...this])
  }

  [Symbol.iterator]() { return this.items[Symbol.iterator]() }
}

type Links = Record<string, Link[]>

const bind = recall(
  function bind(ref: ReferenceNode, loc: Loc, name?: string): Loc | null {
    if (ref.kind === 'Directive') switch (loc.type) {
      case 'schema': return loc.locateDirective(name ?? '')
      case 'directive': return loc        
    } else switch (loc.type) {
      case 'schema':
        if (name) return loc.locateType(name)
        break
      case 'type': return loc
    }

    report(new Error('can not bind nodes'))
    return null
  }
)


function getPrefix(name: string, sep = '__'): [string | null, string] {
  const idx = name.indexOf(sep)
  if (idx === -1) return [null, name]
  return [name.substr(0, idx), name.substr(idx + sep.length)]
}


export function reference(name: string): ReferenceNode {
  if (name.startsWith("@"))
    return {
      kind: Kind.DIRECTIVE,
      name: { kind: Kind.NAME, value: name.slice(1) },
    };
  return {
    kind: Kind.NAMED_TYPE,
    name: { kind: Kind.NAME, value: name },
  };
}

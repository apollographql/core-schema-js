import recall, { report, use } from '@protoplasm/recall'
import { ASTNode, DefinitionNode, DirectiveNode, DocumentNode, ExecutableDefinitionNode, Kind, NamedTypeNode, visit } from 'graphql'
import { Maybe } from 'graphql/jsutils/Maybe'
import bootstrap, { id, Link } from './bootstrap'
import directives from './directives'
import err from './error'
import { HgRef } from './hgref'
import { isAst } from './is'
import Scope, { IScopeMut, IScope } from './scope'

export const ErrNoDefinition = (hgref: HgRef, ...nodes: ASTNode[]) =>
  err('NoDefinition', {
    message: 'no definitions found for reference',
    hgref,
    nodes
  })

export type Locatable =
  | Exclude<DefinitionNode, ExecutableDefinitionNode>
  | DirectiveNode
  | NamedTypeNode

export type Located = Locatable & { hgref: HgRef }

const LOCATABLE_KINDS = new Set([
  ...Object.values(Kind)
    .filter(k => k.endsWith('Definition') || k.endsWith('Extension'))    
    .filter(k => !k.startsWith('Field'))
    .filter(k => k !== 'OperationDefinition' && k !== 'FragmentDefinition'),
  Kind.DIRECTIVE,
  Kind.NAMED_TYPE,
])

export function isLocatable(o: any): o is Locatable {
  return LOCATABLE_KINDS.has(o?.kind)
}

export class Schema {
  static from(document: DocumentNode, parent?: Schema) {
    return new this(document, parent)
  }

  public get scope(): Readonly<IScope> {
    return (this.parent?.scope ?? Scope.EMPTY).child(
      (scope: IScopeMut) => {
        for (const dir of directives(this.document)) {
          const linker = linkerFor(scope, dir)          
          if (!linker) continue
          for (const link of linker(dir)) {
            scope.add(link)
          }
        }
        const self = selfIn(scope, directives(this.document))
        if (self) {
          scope.add(self, '')
          scope.add({
            ...self,
            hgref: HgRef.rootDirective(self.hgref.graph)
          }, '@' + self.name)
        }
      })
  }

  get url() { return this.self?.hgref.graph }

  get self() { return this.scope.own('') }

  definitions(ref?: HgRef): Iterable<Hg<Locatable>> {  
    if (!ref) return this.ownDefs()
    if (this.url && !ref.graph) ref = ref.setGraph(this.url)
    return this.defMap.get(ref) ?? []
  }

  private *ownDefs(): Iterable<Hg<Locatable>> {
    for (const def of this.document.definitions) {
      if (isLocatable(def)) yield this.denormalize(def)
    }
  }

  *lookupDefinitions(ref?: HgRef): Iterable<Hg<Locatable>> {
    yield *this.definitions(ref)
    if (this.parent)
      yield *this.parent.lookupDefinitions(ref)
  }

  locate(node: Locatable): HgRef {
    return this.scope.locate(node)
    // if (isAst(node, Kind.SCHEMA_DEFINITION, Kind.SCHEMA_EXTENSION)) {
    //   return HgRef.schema(this.url)
    // }
    // const [ prefix, name ] = getPrefix(node.name.value)    
    // const { scope } = this
    
    // if (prefix) {
    //   const found = scope.lookup(prefix)
    //   if (found) return HgRef.canon(scopeNameFor(node, name), found.hgref.graph)
    // }

    // // if there was no prefix OR the prefix wasn't found,
    // // treat the entire name as a local name
    // //
    // // this means that prefixed__Names will be interpreted
    // // as local names if and only if the prefix has not been `@link`ed 
    // //
    // // this allows for universality — it is always possible to represent
    // // any api with a core schema by appropriately selecting link names
    // // with `@link(as:)` or `@link(import:)`, even if the desired
    // // api contains double-underscored names (odd choice, but you do you)
    // return scope.lookup(scopeNameFor(node))?.hgref ?? HgRef.canon(scopeNameFor(node), this.url)
  }

  fillDefinitions(): Schema {
    const notDefined = new Map<HgRef, Located[]>()
    const failed = new Set<HgRef>()
    const addDefs = new Map<HgRef, Hg<DefinitionNode>>()  

    const ingest = (def: ASTNode) => {
      for (const node of deepRefs(def)) {
        const [first] = this.definitions(node.hgref)
        if (!first && !addDefs.has(node.hgref))
          if (notDefined.has(node.hgref))
            notDefined.get(node.hgref)?.push(node)
          else
            notDefined.set(node.hgref, [node])
      }
    }

    for (const def of this.definitions())
      ingest(def)

    while (notDefined.size) {
      const [ref, nodes] = notDefined.entries().next().value      
      if (!ref) break
      notDefined.delete(ref)
      if (failed.has(ref)) continue
      const defs = [...this.lookupDefinitions(ref)]
      if (!defs.length) {
        report(ErrNoDefinition(ref, ...nodes))
        failed.add(ref)
      }
      for (const def of defs) {        
        if (!addDefs.has(ref)) {
          ingest(def)
          addDefs.set(ref, def as Hg<DefinitionNode>)
        }
      }
    }

    return Schema.from({ ...this.document, definitions: [
      ...this.document.definitions, 
      ...addDefs.values()
    ]}, this.parent)
  }

  @use(recall)
  denormalize<T extends ASTNode>(node: T): Hg<T> {
    const self = this
    return visit(node, {
      enter<T extends Hg<ASTNode>>(node: T): Hg<T> | undefined {
        if (isLocatable(node)) {
          return { ...node, hgref: self.locate(node) } as Hg<T>
        }
        return
      }
    }) as Hg<T>
  }

  private get defMap(): Readonly<Map<HgRef, readonly Hg<Locatable>[]>> {
    const defs = new Map<HgRef, Hg<Locatable>[]>()
    for (const def of this.document.definitions) {
      if (!isLocatable(def)) continue
      const hgref = this.locate(def)
      if (!hgref) continue
      const existing = defs.get(hgref)
      if (existing) existing.push(this.denormalize(def))
      else defs.set(hgref, [this.denormalize(def)])
    }
    return defs
  }

  protected constructor(
    public readonly document: DocumentNode,
    public readonly parent?: Schema,
  ) {}
}

export default Schema

type Hg<T> =
  T extends (infer E)[]
    ? Hg<E>[]
    :
  T extends Locatable
    ? { hgref?: HgRef } & {
      [K in keyof T]: K extends 'kind' | 'loc'
        ? T[K]
        :              
      Hg<T[K]>
    }
    :
  T extends object
    ? {
      [K in keyof T]: K extends 'kind' | 'loc'
        ? T[K]
        :
      Hg<T[K]>
    }
    :    
  T

type ChildOf<T> =
  T extends (infer E)[]
    ? E
    :
  T extends object
    ? {
      [k in keyof T]: T[k] extends (infer E)[]
        ? E
        : T[k]
    }[keyof T]
    :
  T

export function *deepRefs(root: ASTNode | Iterable<ASTNode>): Iterable<Located> {  
  if (isLocatable(root) && hasRef(root)) yield root
  for (const child of children(root)) {
    if (isAst(child)) yield *deepRefs(child)
  }
}

export function *children<T>(root: T): Iterable<ChildOf<T>> {
  if (Array.isArray(root)) return yield *root
  if (typeof root === 'object') {
    for (const child of Object.values(root)) {
      if (Array.isArray(child)) yield *child
      else yield child
    }
  }
}

export const hasRef = (o?: any): o is { hgref: HgRef } =>
  o?.hgref instanceof HgRef

const linkerFor = recall(
  function linkerFor(scope: IScope, dir: DirectiveNode) {
    const self = bootstrap(dir)
    if (self) return self
    const other = scope.lookup('@' + dir.name.value)
    if (!other) return
    return bootstrap(other.via)
  }
)

const selfIn = recall(
  function self(scope: IScope, directives: Iterable<DirectiveNode>): Maybe<Link> {
    for (const dir of directives) {
      const self = id(scope, dir)
      if (self) return self
    }
    return null
  }
)

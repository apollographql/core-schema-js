import recall, { use } from '@protoplasm/recall'
import { ASTNode, DefinitionNode, DirectiveNode, DocumentNode, ExecutableDefinitionNode, Kind, NamedTypeNode, SchemaDefinitionNode, SchemaExtensionNode, visit } from 'graphql'
import { Maybe } from 'graphql/jsutils/Maybe'
import bootstrap, { id, Scope, ScopeMut, SelfLink } from './bootstrap'
import directives from './directives'
import { Term, HgRef } from './hgref'
import { isAst } from './is'
import { ScopeMap } from './scope-map'

export type Locatable =
  | Exclude<DefinitionNode, ExecutableDefinitionNode | SchemaDefinitionNode | SchemaExtensionNode>
  | DirectiveNode
  | NamedTypeNode

export type Located =
  Locatable & { hgref: HgRef }

const LOCATABLE_KINDS = new Set([
  ...Object.values(Kind)
    .filter(k => k.endsWith('Definition') || k.endsWith('Extension'))    
    .filter(k => !k.startsWith('Schema') && !k.startsWith('Field'))
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

  public get scope(): Scope {
    return (this.parent?.scope ?? ScopeMap.EMPTY).child(
      (scope: ScopeMut) => {
        for (const dir of directives(this.document)) {
          const linker = linkerFor(scope, dir)          
          if (!linker) continue
          for (const link of linker(dir)) {
            scope.set(link.term, link)
          }
        }
        const self = selfIn(scope, directives(this.document))
        if (self) {
          // an empty schema ref points to self
          scope.set(Term.schema(), self)
          scope.set(Term.directive(self.term.name), {
            ...self,
            location: HgRef.rootDirective(self.location.graph)
          })
        }
      })
  }

  definitions(ref: HgRef): Iterable<Hg<Locatable>> {  
    if (this.url && !ref.graph) ref = ref.setGraph(this.url)
    return this.defMap.get(ref) ?? []
  }

  *lookupDefinitions(ref: HgRef): Iterable<Hg<Locatable>> {
    yield *this.definitions(ref)
    if (this.parent)
      yield *this.parent.lookupDefinitions(ref)
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

  get url() { return this.self?.location.graph }

  get self() { return this.scope.own(Term.schema()) }

  locate(node: Locatable): HgRef {
    const [ prefix, name ] = getPrefix(node.name.value)    
    const { scope: links } = this
    
    if (prefix) {
      const element = isAst(node, Kind.DIRECTIVE, Kind.DIRECTIVE_DEFINITION)
        ? Term.directive(name)
        : Term.named(name)
      const found = links.lookup(Term.schema(prefix))
      if (found) return found.location.setTerm(element)
    }

    const element = isAst(node, Kind.DIRECTIVE, Kind.DIRECTIVE_DEFINITION)
      ? Term.directive(node.name.value)
      : Term.named(node.name.value)
    return links.lookup(element)?.location ?? HgRef.canon(element, this.url)
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

export function *deepRefs(root: ASTNode): Iterable<Located> {  
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
  function linkerFor(links: Scope, dir: DirectiveNode) {
    const self = bootstrap(dir)
    if (self) return self
    const other = links.lookup(Term.directive(dir.name.value))
    if (!other) return
    return bootstrap(other.via)
  }
)

const selfIn = recall(
  function self(links: Scope, directives: Iterable<DirectiveNode>): Maybe<SelfLink> {
    for (const dir of directives) {
      const self = id(links, dir)
      if (self) return self
    }
    return null
  }
)

function getPrefix(name: string, sep = '__'): [string | null, string] {
  const idx = name.indexOf(sep)
  if (idx === -1) return [null, name]
  return [name.substr(0, idx), name.substr(idx + sep.length)]
}

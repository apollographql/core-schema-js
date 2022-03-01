import recall, { report, use } from '@protoplasm/recall'
import { ArgumentNode, ASTNode, DefinitionNode, DirectiveNode, DocumentNode, ExecutableDefinitionNode, Kind, NamedTypeNode, visit } from 'graphql'
import { Maybe } from 'graphql/jsutils/Maybe'
import { byRef, De, Defs } from './de'
import bootstrap, { id, Link } from './bootstrap'
import directives from './directives'
import err from './error'
import { HgRef } from './hgref'
import { isAst } from './is'
import Scope, { IScopeMut, IScope } from './scope'

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

export class Schema implements Defs {
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

  get url() { return this.scope.url }
  get self() { return this.scope.self }

  *[Symbol.iterator]() {
    for (const def of this.document.definitions) {
      if (isLocatable(def)) yield this.denormalize(def)
    }
  }

  definitions(ref?: HgRef): Defs {
    if (!ref) return this
    if (this.url && !ref.graph) ref = ref.setGraph(this.url)
    return byRef(this).get(ref) ?? []
  }

  *lookupDefinitions(ref?: HgRef): Iterable<De<Locatable>> {
    yield *this.definitions(ref)
    if (this.parent)
      yield *this.parent.lookupDefinitions(ref)
  }

  locate(node: Locatable): HgRef {
    return this.scope.locate(node)
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

  private get defMap(): Readonly<Map<HgRef, readonly De<Locatable>[]>> {
    const defs = new Map<HgRef, De<Locatable>[]>()
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

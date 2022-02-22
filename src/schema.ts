import recall, { use } from '@protoplasm/recall'
import { DefinitionNode, DirectiveNode, DocumentNode, ExecutableDefinitionNode, Kind, NamedTypeNode, SchemaDefinitionNode, SchemaExtensionNode } from 'graphql'
import { Maybe } from 'graphql/jsutils/Maybe'
import bootstrap, { id, Link } from './bootstrap'
import directives from './directives'
import { asDirective, directive, ElementRef, HgRef, named, SchemaRef, withGraph } from './hgref'
import { isAst } from './is'
import { IScope, IScopeMut, Scope } from './scope-map'

export type Links = IScope<Link>

export type Locatable =
  | Exclude<DefinitionNode, ExecutableDefinitionNode | SchemaDefinitionNode | SchemaExtensionNode>
  | DirectiveNode
  | NamedTypeNode

const LOCATABLE_KINDS = new Set([
  ...Object.values(Kind)
    .filter(k => k.endsWith('Definition') || k.endsWith('Extension'))
    .filter(k => !k.startsWith('Schema'))
    .filter(k => k !== 'OperationDefinition' && k !== 'FragmentDefinition'),
  Kind.DIRECTIVE,
  Kind.NAMED_TYPE,
])

export function isLocatable(o: any): o is Locatable {
  return LOCATABLE_KINDS.has(o?.kind)
}

export type BareKind<K extends string> =
  K extends `${infer Name}Definition`
    ? Name
    :
  K extends `${infer Name}Extension`
    ? Name
    :
    never

export class Schema {
  static fromDoc(document: DocumentNode, parent?: Schema) {
    return new this(document, parent)
  }

  public get links(): Links {
    return (this.parent?.links ?? Scope.EMPTY).child(
      (scope: IScopeMut<Link>) => {
        for (const dir of this.directives) {
          const linker = linkerFor(scope, dir)
          if (!linker) continue
          for (const link of linker(dir)) {
            scope.set(link.name, link)
          }
        }
        const self = selfIn(scope, this.directives)
        if (self)
          scope.set(undefined, self)
        if (self?.name)
          scope.set(self.name, self)        
      })
  }

  public get directives(): Iterable<DirectiveNode> {
    return directives(this.document)
  }

  definitions(ref?: HgRef): Iterable<DefinitionNode> {
    if (!ref) return this.document.definitions
    if (this.url && !ref.graph) ref = withGraph(ref, this.url)
    return this.defMap.get(ref) ?? []
  }

  *lookupDefinitions(ref?: HgRef): Iterable<DefinitionNode> {
    yield *this.definitions(ref)
    if (this.parent)
      yield *this.parent.lookupDefinitions(ref)
  }

  get url() { return this.self?.location.graph }

  get self() { return this.links.own(undefined) }

  locate(node: Locatable): ElementRef | undefined {
    const [ prefix, name ] = getPrefix(node.name.value)    
    const { links } = this
    
    if (!prefix) {
      // node name has no prefix, e.g. "federation"
      const found = links.lookup(name)
      if (found) {
        // if we found the raw name and are looking for a directive,
        // return the location as a directive location
        if (isAst(node, Kind.DIRECTIVE, Kind.DIRECTIVE_DEFINITION)) {
          // `asDirective` returns the root directive location
          // of a schema hgref and returns directive locations
          // unmodified          
          const hgref = asDirective(found.location)
          // if asDirective returned null, we found a named location
          // which can't be bound to a directive
          if (hgref) return hgref
          // error: cound not bind
          return
        }
        if (found.location.refKind === 'named')
          return found.location
        // error: could not bind
        return
      }
    } else {
      // node name has a prefix, e.g. "federation__requires"
      const found = links.lookup(prefix)
      if (found) {
        // the prefix MUST reference a schema (schemas
        // are currently the only indexable type)
        if (found.location.refKind !== 'schema') {
          // error: could not bind
          return
        }
        return isAst(node, Kind.DIRECTIVE, Kind.DIRECTIVE_DEFINITION)
          ? directive(name, found.location.graph)
          : named(name, found.location.graph)
      }
    }

    // if we arrive here, the name, prefixed or not, was not found
    // in scope. we assume this is a local reference.
    return isAst(node, Kind.DIRECTIVE, Kind.DIRECTIVE_DEFINITION)
      ? directive(node.name.value, this.self?.location.graph)
      : named(node.name.value, this.self?.location.graph)
  }

  private get defMap(): Readonly<Map<HgRef, readonly DefinitionNode[]>> {
    const defs = new Map<HgRef, DefinitionNode[]>()
    for (const def of this.document.definitions) {
      if (!isLocatable(def)) continue
      const loc = this.locate(def)
      if (!loc) continue
      const existing = defs.get(loc)
      if (existing) existing.push(def)
      else defs.set(loc, [def])
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
  function linkerFor(links: Links, dir: DirectiveNode) {
    const self = bootstrap(dir)
    if (self) return self
    const other = links.lookup(dir.name.value)
    if (!other) return
    return bootstrap(other.via)
  }
)

const selfIn = recall(
  function self(links: Links, directives: Iterable<DirectiveNode>): Maybe<Link<SchemaRef>> {
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

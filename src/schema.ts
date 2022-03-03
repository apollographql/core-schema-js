import recall, { replay, use } from '@protoplasm/recall'
import { DirectiveNode, DocumentNode, Kind, SchemaExtensionNode } from 'graphql'
import { Maybe } from 'graphql/jsutils/Maybe'
import { refsIn, byRef, Defs, isLocatable, Locatable, fill, De } from './de'
import { id, Link, Linker, LINK_DIRECTIVES } from './bootstrap'
import directives from './directives'
import { HgRef } from './hgref'
import Scope, { including, IScope } from './scope'
import { isAst } from './is'
import gql from './gql'
export class Schema implements Defs {  
  static from(document: DocumentNode, frame: Schema | IScope = Scope.EMPTY) {
    if (frame instanceof Schema)
      return new this(document, frame.scope)
    return new this(document, frame)
  }

  static readonly BASIC = Schema.from(
    gql `${'builtin:schema/basic'}  
      @link(url: "https://specs.apollo.dev/link/v0.3")
      @link(url: "https://specs.apollo.dev/id/v1.0")
    `)

  static basic(document: DocumentNode) {
    return this.from(document, this.BASIC)
  }
  
  public get scope(): IScope {
    return this.frame.child(
      scope => {
        for (const dir of directives(this.document)) {
          const linker = Linker.from(scope, dir)
          if (!linker) continue
          for (const link of linker.links(dir)) {
            scope.add(link)
          }
        }
        const self = selfIn(scope, directives(this.document))
        if (self) {
          scope.add({
            ...self,
            name: ''
          })
          scope.add({
            ...self,
            name: '@' + self.name,
            hgref: HgRef.rootDirective(self.hgref.graph)
          })
        }
      })
  }

  get url() { return this.scope.url }
  get self() { return this.scope.self }

  *[Symbol.iterator]() {
    const {scope} = this
    for (const def of this.document.definitions) {
      if (isLocatable(def)) yield scope.denormalize(def)
    }
  }

  @use(replay)
  get refs() {
    return refsIn(this)
  }

  definitions(ref?: HgRef): Defs {
    if (!ref) return this
    if (this.url && !ref.graph) ref = ref.setGraph(this.url)
    return byRef(this).get(ref) ?? []
  }

  locate(node: Locatable): HgRef {
    return this.scope.locate(node)
  }

  compile(atlas?: Defs): Schema {
    let flat = this.scope.flat
    const directives = [...flat.linker?.synthesize(flat) ?? []]
    let scope = flat
    while (scope[Symbol.iterator]().next().value) {
      scope = scope.child(including(refsIn(directives)))
      directives.push(...scope.linker?.synthesize(scope) ?? [])
    }
    
    const header: De<SchemaExtensionNode>[] = directives.length
      ? [{
          kind: Kind.SCHEMA_EXTENSION,
          directives,
          hgref: HgRef.schema(this.url)
        }] : []
    const extras = fill([...header, ...this], atlas)
    scope = scope.child(including(refsIn(extras))).flat
    
    const finalDirs = [...scope.linker?.synthesize(scope) ?? []]
    const hdr: Defs = directives.length
      ? [{
          kind: Kind.SCHEMA_EXTENSION,
          directives: finalDirs,
          hgref: HgRef.schema(this.url)
        }] : []

    return Schema.from({
      kind: Kind.DOCUMENT,
      definitions: [
        ...scope.renormalizeDefs([
          ...hdr,
          ...pruneLinks(this),
          ...extras
        ])
      ]
    })
  }

  protected constructor(
    public readonly document: DocumentNode,
    public readonly frame: IScope,
  ) {}
}

export default Schema

const selfIn = recall(
  function self(scope: IScope, directives: Iterable<DirectiveNode>): Maybe<Link> {
    for (const dir of directives) {
      const self = id(scope, dir)
      if (self) return self
    }
    return null
  }
)

function *pruneLinks(defs: Defs): Defs {
  for (const def of defs) {
    if (isAst(def, Kind.SCHEMA_DEFINITION, Kind.SCHEMA_EXTENSION)) {
      if (!def.directives) yield def
      const directives = def.directives?.filter(dir => !LINK_DIRECTIVES.has(dir.hgref))
      if (!directives?.length && !def.operationTypes?.length)
        continue
      yield { ...def, directives }
      continue
    }
    yield def
  }
}

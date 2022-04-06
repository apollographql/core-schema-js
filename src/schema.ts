import recall, { getResult, replay, report, use } from '@protoplasm/recall'
import { print, DirectiveNode, DocumentNode, Kind, SchemaExtensionNode, SchemaDefinitionNode } from 'graphql'
import { Maybe } from 'graphql/jsutils/Maybe'
import { refNodesIn, Defs, isLocatable, Locatable, fill, De, Def, isRedirect } from './de'
import { id, Link, Linker, LINK_DIRECTIVES } from './linker'
import directives from './directives'
import { GRef, byGref } from './gref'
import Scope, { including, IScope } from './scope'
import { isAst } from './is'
import gql from './gql'
import LinkUrl from './link-url'
import {concat, first, flat} from './each'
export class Schema implements Defs {  
  static from(document: DocumentNode, frame: Schema | IScope = Scope.EMPTY) {
    if (frame instanceof Schema)
      return new this(document, frame.scope)
    return new this(document, frame)
  }

  static readonly BASIC = Schema.from(
    gql `${'builtin:schema/basic'}
      @link(url: "https://specs.apollo.dev/link/v0.3")
      @link(url: "https://specs.graphql.org", import: """
        @deprecated @specifiedBy
        Int Float String Boolean ID
      """)
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
            name: '',
            implicit: true,
          })
          scope.add({
            ...self,
            name: '@' + self.name,
            gref: GRef.rootDirective(self.gref.graph),
            implicit: true,
          })
        }
      })
  }

  get url() { return this.scope.url }
  get self() { return this.scope.self }

  *[Symbol.iterator](): Iterator<Def> {
    const {scope} = this
    for (const def of this.document.definitions) {
      if (isLocatable(def)) yield scope.denormalize(def)
    }
    for (const link of scope) {
      if (!link.name || !link.gref.name || link.implicit || !link.via) continue
      yield {
        code: 'Redirect' as const,
        gref: GRef.named(link.name, scope.url),
        toGref: link.gref,
        via: link.via,
      }
    }
  }

  @use(replay)
  get refs() {
    return refNodesIn(this)
  }

  definitions(ref?: GRef): Defs {
    if (!ref) return this
    if (this.url && !ref.graph) ref = ref.setGraph(this.url)
    return byGref(this).get(ref) ?? []
  }

  locate(node: Locatable): GRef {
    return this.scope.locate(node)
  }

  standardize(...urls: (LinkUrl | string)[]) {
    const graphs = new Set(urls.map(u => LinkUrl.from(u)!))
    const standard = Scope.create(scope => {
      for (const graph of graphs) {
        const {name} = graph
        if (!name)
          throw new Error('urls sent to standardize must have names')
        scope.add({
          name, gref: GRef.schema(graph)
        })
      }
    })
    const newScope = Scope.create((scope) => {
      const flat = this.scope.flat
      for (const link of flat) {
        if (!graphs.has(link.gref.graph!)) scope.add(link);
      }
      for (const link of standard) scope.add(link);
    });
    return Schema.from({
      kind: Kind.DOCUMENT,
      definitions: [
        ...newScope.renormalizeDefs([
          ...newScope.header(),
          ...pruneLinks(this)
        ]),
      ],
    });    
  }

  compile(atlas?: Defs): Schema {
    const result = getResult(() => {
      const extras = [...fill(this, atlas)]
      const scope = this.scope.child(including(refNodesIn(extras))).flat
      const header = scope.header()
      const body = [...pruneLinks(this)]
      const linkExtras = [...fill(concat(header, extras), atlas)]
      return {extras, scope, header, body, linkExtras}
    })
    report(result.log)

    const {extras, scope, header, body, linkExtras} = result.unwrap()    
    const redirects = byGref(result.log.collectUnique(isRedirect))
    console.log(redirects)
    
    return Schema.from({
      kind: Kind.DOCUMENT,
      definitions: [
        ...scope.renormalizeDefs(concat(
          header,
          body,
          linkExtras,
          extras
        ))
      ]
    })
  }

  print(): string {
    return print(this.document)
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

export function *pruneLinks(defs: Defs): Defs {
  for (const def of defs) {
    if (isAst(def, Kind.SCHEMA_DEFINITION, Kind.SCHEMA_EXTENSION)) {
      if (!def.directives) yield def
      const directives = def.directives?.filter(dir => !LINK_DIRECTIVES.has((dir as any).gref))
      if (!directives?.length && !def.operationTypes?.length && !(def as SchemaDefinitionNode).description)
        continue
      yield { ...def, directives }
      continue
    }
    yield def
  }
}
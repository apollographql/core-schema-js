import recall from '@protoplasm/recall'
import { DirectiveNode, DocumentNode, Kind, SchemaExtensionNode } from 'graphql'
import { Maybe } from 'graphql/jsutils/Maybe'
import { refsInDefs, byRef, Defs, isLocatable, Locatable, fill } from './de'
import { id, Link, Linker, LINK_DIRECTIVES } from './bootstrap'
import directives from './directives'
import { HgRef } from './hgref'
import Scope, { including, IScope } from './scope'
import { isAst } from './is'

export class Schema implements Defs {
  static from(document: DocumentNode, frame: Schema | IScope = Scope.EMPTY) {
    if (frame instanceof Schema)
      return new this(document, frame.scope)
    return new this(document, frame)
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

  definitions(ref?: HgRef): Defs {
    if (!ref) return this
    if (this.url && !ref.graph) ref = ref.setGraph(this.url)
    return byRef(this).get(ref) ?? []
  }

  locate(node: Locatable): HgRef {
    return this.scope.locate(node)
  }

  fill(atlas?: Defs): Schema {
    return this.append(fill(this, atlas))
  }

  toCore(): Schema {
    const directives = [...this.scope.linker?.synthesize(this.scope.flat) ?? []]
    const header: SchemaExtensionNode[] = directives.length
      ? [{
        kind: Kind.SCHEMA_EXTENSION,
        directives
      }] : []
    return Schema.from({
      kind: Kind.DOCUMENT,
      definitions: [
        ...header,
        ...pruneLinks(this),
      ]
    })
  }

  append(defs: Defs): Schema {
    const scope = this.scope.child(including(refsInDefs(defs)))
    const directives = [...scope.linker?.synthesize(scope) ?? []]
    const header: SchemaExtensionNode[] = directives.length
      ? [{
        kind: Kind.SCHEMA_EXTENSION,
        directives
      }] : []
    return Schema.from({
      kind: Kind.DOCUMENT,
      definitions: [
        ...this,
        ...header,
        ...scope.renormalizeDefs(defs)
      ]
    }, scope.parent?.parent)
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

function *pruneLinks(defs: Defs) {
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

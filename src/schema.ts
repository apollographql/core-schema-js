import recall from '@protoplasm/recall'
import { ASTNode, DirectiveNode, DocumentNode, Kind } from 'graphql'
import { Maybe } from 'graphql/jsutils/Maybe'
import { deepRefs, refsInDefs, byRef, De, Defs, isLocatable, Locatable, fill } from './de'
import bootstrap, { id, Link, Linker } from './bootstrap'
import directives from './directives'
import { HgRef } from './hgref'
import Scope, { including, IScope } from './scope'

export class Schema implements Defs {
  static from(document: DocumentNode, frame: Schema | IScope = Scope.EMPTY) {
    if (frame instanceof Schema)
      return new this(document, frame.scope)
    return new this(document, frame)
  }

  // static compile(defs: Defs, local: IScope = Scope.EMPTY) {
  //   // const scope = scope.
    
  //   local.child(
  //     scope => {
  //       for (const def of defs)
  //         ingest(def)
        
  //       function ingest(node: De<ASTNode>) {
  //         for (const ref of deepRefs(node)) {
            
  //         }
  //       }
  //     }
  //   )
  // }

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

  // compile(atlas?: Defs): Schema {
  //   const defs = fill(this, atlas)
  // }

  append(defs: Defs): Schema {
    const scope = this.scope.child(including(refsInDefs(defs)))

    return Schema.from({
      kind: Kind.DOCUMENT,
      definitions: [
        ...this.definitions(),
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

const linkerFor = recall(
  function linkerFor(scope: IScope, dir: DirectiveNode) {
    const self = bootstrap(dir)
    if (self) return self
    const other = scope.lookup('@' + dir.name.value)
    if (!other?.via) return
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

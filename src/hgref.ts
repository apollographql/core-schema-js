import recall, { use } from '@protoplasm/recall'
import LinkUrl from './link-url'

export class HgRef {
  @use(recall)
  static canon(name: string, graph?: LinkUrl): HgRef {
    return new this(name, graph)
  }

  static named(name: string, graph?: LinkUrl | string) {
    return this.canon(name, LinkUrl.from(graph))
  }

  static directive(name: string, graph?: LinkUrl | string) {
    return this.canon('@' + name, LinkUrl.from(graph))
  }

  static rootDirective(graph?: LinkUrl | string) {
    return this.directive('', graph)
  }

  static schema(graph?: LinkUrl | string) {
    return this.canon('', LinkUrl.from(graph))
  }

  setGraph(graph?: LinkUrl | string) {
    return HgRef.canon(this.name, LinkUrl.from(graph))
  }

  setName(name: string) {
    return HgRef.canon(name, this.graph)
  }

  toString() {
    const graph = this.graph?.href ?? ''
    return graph + (this.name ? `#${this.name}` : '')
  }

  private constructor(public readonly name: string, public readonly graph?: LinkUrl) {}
}

export default HgRef

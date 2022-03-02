import recall, { replay, use } from '@protoplasm/recall'
import { GraphQLDirective, DirectiveNode, DirectiveLocation, GraphQLScalarType, GraphQLNonNull, Kind, ConstDirectiveNode, ConstArgumentNode, ValueNode } from 'graphql'
import { getArgumentValues } from 'graphql/execution/values'
import { Maybe } from 'graphql/jsutils/Maybe'
import { ImportNode, ImportsParser } from './import'
import type { IScope } from './scope'
import {LinkUrl} from './location'
import { HgRef } from './hgref'
import { scopeNameFor } from './names'
import { groupBy } from './each'

const LINK_SPECS = new Map([
  ['https://specs.apollo.dev/core/v0.1', 'feature'],
  ['https://specs.apollo.dev/core/v0.2', 'feature'],
  ['https://specs.apollo.dev/link/v0.3', 'url'],
])

const Url = new GraphQLScalarType({
  name: 'Url',
  parseValue: val => val,  
  parseLiteral(node): Maybe<LinkUrl> {
    if (node.kind === 'StringValue')
      return LinkUrl.parse(node.value)
    return null
  }
})

const Name = new GraphQLScalarType({
  name: 'Name',
  parseValue: val => val,
  parseLiteral(node): Maybe<string> {
    if (node.kind === 'StringValue') return node.value
    if (node.kind === 'EnumValue') return node.value
    return
  }
})

const Imports = new GraphQLScalarType({
  name: 'Imports',
  parseValue: val => val,
  parseLiteral(value: ValueNode): Maybe<ImportNode[]> {
    if (value.kind === Kind.LIST) {
      const text = value.values.map(value => {
        if (value.kind === Kind.STRING)
          return value.value
        return undefined
      }).filter(Boolean).join(' ')
      return ImportsParser.fromString(text)
    }
    if (value.kind !== Kind.STRING) return
    return ImportsParser.fromString(value.value)
  }
})

const $bootstrap = new GraphQLDirective({
  name: 'link',
  args: {
    url: { type: Url },
    feature: { type: Url },
    as: { type: Name },
  },
  locations: [ DirectiveLocation.SCHEMA ],
  isRepeatable: true,
})

export interface Link {
  name: string
  hgref: HgRef
  via?: DirectiveNode
  linker?: Linker
}

const $id = new GraphQLDirective({
  name: 'id',
  args: {
    url: { type: new GraphQLNonNull(Url) },
    as: { type: Name },
  },
  locations: [DirectiveLocation.SCHEMA],
  isRepeatable: true,
})

const ID_DIRECTIVE = HgRef.rootDirective('https://specs.apollo.dev/id/v1.0')

export const id = recall(
  function id(scope: IScope, dir: DirectiveNode): Maybe<Link> {
    if (scope.locate(dir) === ID_DIRECTIVE) {
      const args = getArgumentValues($id, dir)
      const url = args.url as LinkUrl
      const name: string = (args.as ?? url.name) as string
      return {
        name,
        hgref: HgRef.schema(url),
        via: dir,
      }
    }
    return null
  }
)

export class Linker {
  static from(scope: IScope, dir: DirectiveNode): Maybe<Linker> {
    const self = this.bootstrap(dir)
    if (self) return self
    const other = scope.lookup('@' + dir.name.value)
    return other?.linker
  }

  @use(recall)
  static bootstrap(strap: DirectiveNode): Maybe<Linker> {    
    const args = getArgumentValues($bootstrap, strap)
    const url: Maybe<LinkUrl> = (args.url ?? args.feature) as LinkUrl
    if (!url) return
    const urlArg = LINK_SPECS.get(url.href)
    if (!urlArg) return
    if (args[urlArg] !== url) return
    return new this(strap, urlArg)
  }

  protected constructor(public readonly strap: DirectiveNode,
    private readonly urlParam: string) {}

  #link = new GraphQLDirective({
    name: this.strap.name.value,
    args: {
      [this.urlParam]: { type: new GraphQLNonNull(Url) },
      as: { type: Name },
      import: { type: Imports },
    },
    locations: [DirectiveLocation.SCHEMA],
    isRepeatable: true,
  })

  @use(replay)
  *links(directive: DirectiveNode): Iterable<Link> {
    const args = getArgumentValues(this.#link, directive)
    const url = args[this.urlParam] as LinkUrl
    const name: string = (args.as ?? url.name) as string
    if (name !== '') {
      yield {
        name,
        hgref: HgRef.schema(url),
        via: directive,
        linker: this,
      }
      yield {
        name: '@' + name,
        hgref: HgRef.rootDirective(url),
        via: directive,
        linker: this,
      }
    }
    for (const i of args.import as ImportNode[] ?? []) {
      const alias = scopeNameFor(i.alias ?? i.element)
      const name = scopeNameFor(i.element)
      yield {
        name: alias,
        hgref: HgRef.named(name, url),
        via: directive,
        linker: this,
      }
    }    
  }

  *synthesize(links: Iterable<Link>): Iterable<ConstDirectiveNode> {
    for (const [url, linksForUrl] of byUrl(links)) {
      if (!url) continue
      let alias: string = ''
      const imports: [string, string][] = []
      for (const link of linksForUrl) {
        if (!link.hgref.name) {
          // a link to the schema tells us the alias,
          // if any
          alias = link.name
          continue
        }
        if (link.hgref.name === '@')          
          continue // root directive is implict
        imports.push([link.name, link.hgref.name])
      }
      const args: ConstArgumentNode[] = [{
        kind: Kind.ARGUMENT,
        name: {
          kind: Kind.NAME,
          value: this.urlParam
        },
        value: {
          kind: Kind.STRING,
          value: url.href,
        },
      }]

      if (alias === '' || alias !== url.name) {
        args.push({
          kind: Kind.ARGUMENT,
          name: {
            kind: Kind.NAME,
            value: 'as',
          },
          value: {
            kind: Kind.STRING,
            value: alias
          },
        })
      }

      if (imports.length) {
        args.push({
          kind: Kind.ARGUMENT,
          name: {
            kind: Kind.NAME,
            value: 'import',
          },
          value: {
            kind: Kind.STRING,
            value: imports.map(([alias, name]) =>
              alias === name
                ? name
                : `${alias}: ${name}`
            ).join(' ')
          },
        })
      }
        
      yield {
        kind: Kind.DIRECTIVE,
        name: this.strap.name,
        arguments: args
      }
    }
  }
}

const byUrl = groupBy((link: Link) => link.hgref.graph)


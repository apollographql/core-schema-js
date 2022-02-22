import recall, { replay } from '@protoplasm/recall'
import { GraphQLDirective, DirectiveNode, DirectiveLocation, GraphQLScalarType, GraphQLNonNull, Kind } from 'graphql'
import { getArgumentValues } from 'graphql/execution/values'
import { Maybe } from 'graphql/jsutils/Maybe'
import { ImportNode, ImportsParser } from './import'
import type { IScope } from './scope-map'
import {LinkUrl} from './location'
import { HgRef, SchemaRef, rootDirective, directive as namedDirective, named, schema } from './hgref'

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
  parseLiteral(node): Maybe<ImportNode[]> {
    if (node.kind !== 'StringValue') return
    return ImportsParser.fromString(node.value)
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

export interface Link<L extends HgRef = HgRef> {
  name: string
  location: L
  via: DirectiveNode
  self?: true
}

export type Linker = (directive: DirectiveNode) => Iterable<Link>

export default recall(
  function bootstrap(bootstrap: DirectiveNode): Maybe<Linker> {    
    const args = getArgumentValues($bootstrap, bootstrap)
    const url: Maybe<LinkUrl> = (args.url ?? args.feature) as LinkUrl
    if (!url) return
    const urlArg = LINK_SPECS.get(url.href)
    if (!urlArg) return
    if (args[urlArg] !== url) return
    const name = (args.as ?? url.name) as string
    const self: Link = { name, location: schema(url), via: bootstrap }
    return linker(self, urlArg)
  }
)

const $id = new GraphQLDirective({
  name: 'id',
  args: {
    url: { type: new GraphQLNonNull(Url) },
    as: { type: Name },
  },
  locations: [DirectiveLocation.SCHEMA],
  isRepeatable: true,
})

const ID_DIRECTIVE = rootDirective('https://specs.apollo.dev/id/v1.0')
const ID_SCHEMA = schema('https://specs.apollo.dev/id/v1.0')

export const id = recall(
  function id(scope: IScope<Link, string>, dir: DirectiveNode): Maybe<Link<SchemaRef>> {
    const link = scope.lookup(dir.name.value)
    if (!link) return
    const {location} = link
    if (location === ID_DIRECTIVE || location === ID_SCHEMA) {
      const args = getArgumentValues($id, dir)
      const url = args.url as LinkUrl
      const name: string = (args.as ?? url.name) as string
      return { name, location: schema(url), via: dir, self: true }
    }
    return null
  }
)

function linker(self: Link, urlParam: string) {
  const $link = new GraphQLDirective({
    name: self.via.name.value,
    args: {
      [urlParam]: { type: new GraphQLNonNull(Url) },
      as: { type: Name },
      import: { type: Imports },
    },
    locations: [DirectiveLocation.SCHEMA],
    isRepeatable: true,
  })

  return replay(
    function *linksFromDirective(directive: DirectiveNode): Generator<Link> {
      if (directive === self.via) return yield self
      const args = getArgumentValues($link, directive)
      const url = args[urlParam] as LinkUrl
      const name: string = (args.as ?? url.name) as string
      if (name !== '')
        yield { name, location: schema(url), via: directive }
      for (const i of args.import as ImportNode[] ?? []) {
        const name = i.alias?.name ?? i.element.name        
        const link = {
          name: name.value,
          location: i.element.kind === Kind.DIRECTIVE
            ? namedDirective(i.element.name.value, url)
            : named(i.element.name.value, url),
          via: directive
        }
        yield link
      }
    }
  )
}

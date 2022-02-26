import recall, { replay } from '@protoplasm/recall'
import { GraphQLDirective, DirectiveNode, DirectiveLocation, GraphQLScalarType, GraphQLNonNull } from 'graphql'
import { getArgumentValues } from 'graphql/execution/values'
import { Maybe } from 'graphql/jsutils/Maybe'
import { ImportNode, ImportsParser } from './import'
import type { IScope } from './scope'
import {LinkUrl} from './location'
import { HgRef } from './hgref'
import { scopeNameFor } from './names'

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

export interface Link {
  name: string
  hgref: HgRef
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
    return linker(bootstrap, urlArg)
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
        self: true
      }
    }
    return null
  }
)

function linker(strap: DirectiveNode, urlParam: string) {
  const $link = new GraphQLDirective({
    name: strap.name.value,
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
      const args = getArgumentValues($link, directive)
      const url = args[urlParam] as LinkUrl
      const name: string = (args.as ?? url.name) as string
      if (name !== '') {
        yield {
          name,
          hgref: HgRef.schema(url),
          via: directive
        }
        yield {
          name: '@' + name,
          hgref: HgRef.rootDirective(url),
          via: directive
        }
      }
      for (const i of args.import as ImportNode[] ?? []) {
        const alias = scopeNameFor(i.alias ?? i.element)
        const name = scopeNameFor(i.element)
        yield { name: alias, hgref: HgRef.canon(name, url), via: directive }        
      }
    }
  )
}

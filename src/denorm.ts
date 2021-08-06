import { CoreSchema, Item, Schema } from './schema'
import { ASTNode, GraphQLDirective, NameNode, visit } from 'graphql'
import { Context } from './core'
import Features, { Feature } from './features'
import { hasDirectives, hasName } from './is'
import FeatureUrl from './feature-url'
import { getArgumentValues } from 'graphql/execution/values'

export class Denormalized extends Schema {
  get features(): Features {
    return this.get(features)
  }

  *read(directive: GraphQLDirective | FeatureUrl | string, node: ASTNode): Generator<Item, void, unknown> {
    const url =
      directive instanceof FeatureUrl ? directive
      : typeof directive === 'string' ? FeatureUrl.parse(directive)
      : FeatureUrl.parse(directive.extensions?.specifiedBy)  
    const name = `<'${url}'>`
    const feature = this.features.find(url)

    if (!hasDirectives(node)) return
    if (!feature) return
    for (const d of node.directives) {
      if (d.name.value === name) {
        const data = directive instanceof GraphQLDirective
          ? getArgumentValues(directive, d)
          : undefined
        const item: Item = {
          node,
          directive: d,            
          feature,
          canonicalName: feature?.canonicalName(d)!,
        }
        if (data != null) item.data = data
        yield item
      }
    }
  }  
}

export function denormalize(core: CoreSchema & Context) {
  core.pure(core.document)
  return new Denormalized(visit(core.document, {
    Name(node: NameNode, key: string | number, parent: ASTNode) {
      if (!parent || !hasName(parent)) return
      if (key !== 'name') return
      const feature = core.featureFor(parent)
      if (!feature) return
      return { ...node, value: `<'${elementUrl(feature, parent)}'>`}
    }
  } as any))
}

export function features(this: Denormalized & Context) {
  this.pure(this.document)
  const features = new Features
  visit(this.document, {
    Name(node: NameNode) {
      const denormed = featureFromDenorm(node.value)
      if (!denormed) return
      features.add(denormed)
    }
  })
  return features
}

function featureFromDenorm(name: string): Feature | null {
  if (!name.startsWith("<'")) return null
  const url = FeatureUrl.parse(name.substring("<'".length, name.length - "'>".length))
  return new Feature(url)
}

const denormFeatureUrl = (feature: Feature) =>
  feature.url.base.toString() +
    (feature.purpose ? `?for=${feature.purpose}` : '')

const elementUrl = (feature: Feature, node: ASTNode & { name: NameNode }) =>
  `${denormFeatureUrl(feature)}#${feature.canonicalName(node)}`

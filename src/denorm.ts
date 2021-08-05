import { CoreSchemaContext } from './schema'
import { ASTNode, NameNode, visit } from 'graphql'
import Core from './core'
import { Feature } from './features'
import { hasName } from './is'

export function denormalize(core: CoreSchemaContext) {
  core.pure(core.document)
  return new Core(visit(core.document, {
    Name(node: NameNode, key: string | number, parent: ASTNode) {
      if (!parent || !hasName(parent)) return
      if (key !== 'name') return
      const feature = core.featureFor(parent)
      if (!feature) return
      return { ...node, value: `<'${elementUrl(feature, parent)}'>`}
    }
  } as any))
}

const denormFeatureUrl = (feature: Feature) =>
  feature.url.base.toString() +
    (feature.purpose ? `?for=${feature.purpose}` : '')

const elementUrl = (feature: Feature, node: ASTNode & { name: NameNode }) =>
  `${denormFeatureUrl(feature)}#${feature.canonicalName(node)}`
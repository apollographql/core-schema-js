import { DirectiveNode } from 'graphql'
import { GraphQLErrorProps } from './error'
import FeatureUrl from './feature-url'

export const E_TOO_MANY_FEATURE_VERSIONS = 'TooManyFeatureVersions'
const ErrTooManyFeatureVersions = (features: Feature[]) => ({
  code: E_TOO_MANY_FEATURE_VERSIONS,
  message: `too many versions of ${features[0].url.identity} at v${features[0].url.version.series}`,
  features,
  major: features[0].url.version.major,
  nodes: features.map(f => f.directive),
})

export interface Feature {
  url: FeatureUrl
  name: string
  purpose?: 'SECURITY' | 'EXECUTION'
  directive: DirectiveNode
}

export interface ReadonlyFeatures {
  find(feature: FeatureUrl | string, exact?: boolean): Feature | null
  validate(): GraphQLErrorProps[]
  [Symbol.iterator](): Iterator<Feature>
}
  
export class Features implements ReadonlyFeatures {
  add(feature: Feature) {
    const majors = this.findOrCreateIdentity(feature.url.identity)
    const {series} = feature.url.version
    const existing = majors.get(series)
    if (existing != null) {
      existing.push(feature)
      return
    }
    majors.set(series, [feature])
  }

  find(feature: FeatureUrl | string, exact = false) {
    feature = typeof feature === 'string' ? FeatureUrl.parse(feature) : feature
    const documentFeature = this.features.get(feature.identity)?.get(feature.version.series)?.[0]
    if ((exact && documentFeature?.url.equals(feature)) ||
        (!exact && documentFeature?.url.satisfies(feature)))
      return documentFeature
    return null
  }

  *[Symbol.iterator]() {
    for (const majors of this.features.values()) {
      for (const features of majors.values()) {
        yield *features
      }
    }
  }

  validate(): GraphQLErrorProps[] {
    const errors: GraphQLErrorProps[] = []
    for (const [_, majors] of this.features) {
      for (const [_, features] of majors) {
        if (features.length <= 1) continue
        errors.push(ErrTooManyFeatureVersions(features))
      }
    }
    return errors
  }

  readonly features: Map<string, Map<string, Feature[]>> = new Map

  private findOrCreateIdentity(identity: string) {
    const existing = this.features.get(identity)
    if (existing) return existing
    const created = new Map<string, Feature[]>()
    this.features.set(identity, created)
    return created
  }
}
  
export default Features
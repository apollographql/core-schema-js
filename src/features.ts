import { DirectiveNode } from 'graphql'
import { err } from './error'
import FeatureUrl from './feature-url'
import { getPrefix } from './names'

const ErrTooManyFeatureVersions = (features: Feature[]) =>
  err('TooManyFeatureVersions', {
    message: `too many versions of ${features[0].url.identity} at v${features[0].url.version.series}`,
    features,
    major: features[0].url.version.major,
    nodes: features.map(f => f.directive),
  })

export class Feature {
  constructor(public readonly url: FeatureUrl,
    public readonly name: string,
    public readonly directive: DirectiveNode,   
    public readonly purpose?: 'SECURITY' | 'EXECUTION') {}

  canonicalName(docName: string): string | null {
    const [prefix, base] = getPrefix(docName)
    if (prefix) {
      if (prefix !== this.name) return null
      return `${this.url.name}__${base}`
    }
    if (base !== this.name) return null
    return this.url.name
  }
}

export interface ReadonlyFeatures {
  find(feature: FeatureUrl | string, exact?: boolean): Feature | null
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

  documentName(feature: FeatureUrl | string, exact = false) {
    feature = typeof feature === 'string' ? FeatureUrl.parse(feature) : feature
    const found = this.find(feature, exact)
    if (!found) return null
    const element = feature.isDirective ? feature.element?.slice(1) : feature.element

    // if the feature url does not contain an element hash or references the
    // root directive, return the name of the feature
    if (!element || feature.isDirective && (element === found.url.name))
      return found.name
    
    return found.name + '__' + element
  }

  *[Symbol.iterator]() {
    for (const majors of this.features.values()) {
      for (const features of majors.values()) {
        yield *features
      }
    }
  }

  validate(): Error[] {
    const errors: Error[] = []
    for (const [_, majors] of this.features) {
      for (const [_, features] of majors) {
        if (features.length <= 1) continue
        errors.push(ErrTooManyFeatureVersions(features))
      }
    }
    return errors
  }

  readonly features: Map<string, Map<string, Feature[]>> = new Map

  private findOrCreateIdentity(identity: string): Map<string, Feature[]> {
    const existing = this.features.get(identity)
    if (existing) return existing
    const created = new Map<string, Feature[]>()
    this.features.set(identity, created)
    return created
  }
}
  
export default Features
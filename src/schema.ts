import { ASTNode, DirectiveNode, DocumentNode, GraphQLDirective, GraphQLEnumType, GraphQLNonNull, GraphQLString, parse, SchemaDefinitionNode, Source } from 'graphql'
import { getArgumentValues } from 'graphql/execution/values'
import Core, { CoreFn, Context, Immutable } from './core'
import { err } from './error'
import FeatureUrl from './feature-url'
import Features, { Feature } from './features'
import { hasDirectives, hasName, isAst } from './is'
import { getPrefix } from './names'

const ErrExtraSchema = (def: SchemaDefinitionNode) =>
  err('ExtraSchema', {
    message: 'extra schema definition ignored',
    nodes: [def]
  })

const ErrNoSchema = () =>
  err('NoSchema', 'no schema definitions found')

const ErrNoCore = (causes: Error[]) =>
  err('NoCore', {
    message: 'no core feature found',
    causes
  })

const ErrBadFeature = (node: DirectiveNode, ...causes: Error[]) =>
  err('BadFeature', {
    message: 'bad core feature request',
    nodes: [node],
    causes
  })

const ErrOverlappingNames = (name: string, features: Feature[]) =>
  err('OverlappingNames', {
    message: `the name "${name}" is defined by multiple features`,
    nodes: features.map(f => f.directive)
  })

export type CoreSchemaContext = Immutable<CoreSchema> & Context
export class CoreSchema extends Core<DocumentNode> {
  public static graphql(parts: TemplateStringsArray, ...replacements: any[]) {
    return CoreSchema.fromSource(
      new Source(String.raw.call(null, parts, ...replacements), '(inline graphql)'))
  }

  public static fromSource(source: Source) {
    return new CoreSchema(parse(source))
  }

  check(...fns: CoreFn<this>[]): this {
    if (!fns.length) fns = [features, names]
    return super.check(...fns)
  }

  get document(): DocumentNode { return this.data }
  get schema(): SchemaDefinitionNode { return this.get(schema) }
  get features(): Features { return this.get(features) }  
  get names(): Map<string, Feature> { return this.get(names) }

  *read(directive: GraphQLDirective | FeatureUrl | string, node: ASTNode) {
    const url =
      directive instanceof FeatureUrl ? directive
      : typeof directive === 'string' ? FeatureUrl.parse(directive)
      : FeatureUrl.parse(directive.extensions?.specifiedBy)  
    const name = this.features.documentName(url)
    const feature = this.features.find(url)
    const match = url.isDirective
      ? (dir: DirectiveNode) => dir.name.value === name
      : (dir: DirectiveNode) => this.featureFor(dir) === feature

    if (!hasDirectives(node)) return
    if (!feature) return
    for (const d of node.directives) {
      if (match(d)) {
        const data = directive instanceof GraphQLDirective
          ? getArgumentValues(directive, d)
          : undefined
        const item: Item = {
          node,
          directive: d,            
          feature,
          canonicalName: '@' + feature?.canonicalName(d.name.value),
        }
        if (data != null) item.data = data
        yield item
      }
    }
  }

  featureFor(node: ASTNode) {
    if (!hasName(node)) return
    
    const [prefix] = getPrefix(node.name.value)
    if (prefix || isAst(node, 'Directive', 'DirectiveDefinition')) {      
      return this.names.get(prefix ?? node.name.value)
    }
    return null
  }
}

export default CoreSchema

export function schema(this: CoreSchemaContext) {
  let schema: SchemaDefinitionNode | null = null
  for (const def of this.document.definitions) {
    if (def.kind === 'SchemaDefinition') {
      if (!schema)
        schema = def
      else
        this.report(ErrExtraSchema(def))
    }
  }
  if (!schema) {
    throw ErrNoSchema()
  }
  return schema
}

export function features(this: CoreSchemaContext) {
  const schema = this.schema
  this.pure(...schema.directives ?? [])
  const noCoreErrors = []
  let coreFeature: Feature | null = null
  const features = new Features
  for (const d of schema.directives || []) {
    if (!coreFeature) try {
      const candidate = getArgumentValues($core, d)
      if (CORE_VERSIONS.has(candidate.feature) &&
          d.name.value === (candidate.as ?? 'core')) {
        const url = FeatureUrl.parse(candidate.feature)
        coreFeature = new Feature(url, candidate.as ?? url.name, d)
      }
    } catch (err) {
      noCoreErrors.push(err)
    }

    if (coreFeature && d.name.value === coreFeature.name) try {
      const values = getArgumentValues($core, d)
      const url = FeatureUrl.parse(values.feature)
      features.add(new Feature(url, values.as ?? url.name, d, values.for))
    } catch (err) {
      this.report(ErrBadFeature(d, err))
    }
  }
  if (!coreFeature) throw ErrNoCore(noCoreErrors)
  this.report(...features.validate())
  return features
}

export function names(this: CoreSchemaContext) {
  const {features} = this
  this.pure(features)
  const names: Map<string, Feature[]> = new Map
  for (const feature of features) {
    if (!names.has(feature.name)) names.set(feature.name, [])
    names.get(feature.name)?.push(feature)
  }
  
  const output: Map<string, Feature> = new Map
  for (const [name, features] of names) {
    if (features.length > 1) {
      this.report(ErrOverlappingNames(name, features))
      continue
    }
    output.set(name, features[0])
  }
  return output
}

export interface Item {
  node: ASTNode
  directive: DirectiveNode,
  feature: Feature,
  canonicalName: string,
  data?: any
}

export function reader(directive: GraphQLDirective | FeatureUrl | string) {  
  const url =
    directive instanceof FeatureUrl ? directive
    : typeof directive === 'string' ? FeatureUrl.parse(directive)
    : FeatureUrl.parse(directive.extensions?.specifiedBy)

  return (core: CoreSchemaContext) => {
    core.pure(core.features)
    const name = core.features.documentName(url)
    const feature = core.features.find(url)
    core.pure(name, feature?.url.toString())
    const match = url.isDirective
      ? (dir: DirectiveNode) => dir.name.value === name
      : (dir: DirectiveNode) => core.featureFor(dir) === feature
    return function *(node: ASTNode) {
      if (!hasDirectives(node)) return
      if (!feature) return
      for (const d of node.directives) {
        if (match(d)) {
          const data = directive instanceof GraphQLDirective
            ? getArgumentValues(directive, d)
            : undefined
          const item: Item = {
            node,
            directive: d,            
            feature,
            canonicalName: '@' + feature?.canonicalName(d.name.value),
          }
          if (data != null) item.data = data
          yield item
        }
      }
    }
  }
}

const CORE_VERSIONS = new Set([
  'https://specs.apollo.dev/core/v0.1',
  'https://specs.apollo.dev/core/v0.2',
])

const Purpose = new GraphQLEnumType({
  name: 'core__Purpose',
  values: {
    SECURITY: {},
    EXECUTION: {},
  },
})

const $core = new GraphQLDirective({
  name: '@core',
  args: {
    feature: { type: GraphQLNonNull(GraphQLString), },
    as: { type: GraphQLString },
    'for': { type: Purpose }
  },
  locations: ['SCHEMA'],
  isRepeatable: true,
})

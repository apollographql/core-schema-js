import { ASTNode, DirectiveNode, DocumentNode, GraphQLDirective, GraphQLEnumType, GraphQLNonNull, GraphQLString, parse, SchemaDefinitionNode, Source } from 'graphql'
import { getArgumentValues } from 'graphql/execution/values'
import Core, { CoreFn, Context } from './core'
import { err } from './error'
import FeatureUrl from './feature-url'
import Features, { Feature } from './features'


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

export type CoreSchemaContext = Readonly<CoreSchema> & Context
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
  get schemaDefinition(): SchemaDefinitionNode { return this.get(schemaDefinition) }
  get features(): Features { return this.get(features) }  
  get names(): Map<string, Feature> { return this.get(names) }

  read(node: ASTNode, directive: GraphQLDirective) {
    return this.get(reader(directive)) (node)
  }
}

export default CoreSchema

export function schemaDefinition(this: CoreSchemaContext) {
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
  const schema = this.schemaDefinition
  this.gate(...schema.directives ?? [])
  const noCoreErrors = []
  let coreFeature: Feature | null = null
  const features = new Features
  for (const d of schema.directives || []) {
    if (!coreFeature) try {
      const candidate = getArgumentValues($core, d)
      if (CORE_VERSIONS.has(candidate.feature) &&
          d.name.value === (candidate.as ?? 'core')) {
        const url = FeatureUrl.parse(candidate.feature)
        coreFeature = {
          url,
          name: candidate.as ?? url.name,
          directive: d
        }
      }
    } catch (err) {
      noCoreErrors.push(err)
    }

    if (coreFeature && d.name.value === coreFeature.name) try {
      const values = getArgumentValues($core, d)
      const url = FeatureUrl.parse(values.feature)
      features.add({
        url,
        name: values.as ?? url.name,
        purpose: values.for,
        directive: d
      })
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
  this.gate(features)
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

const ErrNotDirective = (url: FeatureUrl) =>
  err('NotDirective', {
    message: `feature url "${url}" provided to read() must reference a directive`,
    url,
  })

export function reader(directive: GraphQLDirective) {
  const url = FeatureUrl.parse(directive.extensions?.specifiedBy)
  if (!url.isDirective)
    throw ErrNotDirective(url)
  return (core: CoreSchemaContext) => {
    core.gate(core.features)
    const name = core.features.documentName(url)
    return function *(node: ASTNode) {      
      for (const d of (node as any).directives || []) {
        if (d.name.value === name) {
          yield {
            node,
            directive: d,
            data: getArgumentValues(directive, d) }
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

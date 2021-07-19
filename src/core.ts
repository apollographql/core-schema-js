import { DocumentNode, GraphQLDirective, GraphQLEnumType, GraphQLError, GraphQLNonNull, GraphQLString, SchemaDefinitionNode, parse, DirectiveNode, Source, printError, ASTNode } from 'graphql'
import { getArgumentValues } from 'graphql/execution/values'
import { GraphQLErrorProps, toGraphQLError } from './error'
import FeatureUrl from './feature-url'
import Features, { Feature, ReadonlyFeatures } from './features'

export const E_EXTRA_SCHEMA = 'ExtraSchema'
const ErrExtraSchema = (def: SchemaDefinitionNode) => ({
  code: E_EXTRA_SCHEMA,
  message: 'extra schema definition ignored',
  nodes: [def]
})

export const E_NO_SCHEMA = 'NoSchema'
const ErrNoSchema = {
  code: E_NO_SCHEMA,
  message: 'no schema definitions found'
}

export const E_NO_CORE = 'NoCore'
const ErrNoCore = (causes: Error[]) => ({
  code: E_NO_CORE,
  message: 'no core feature found',
  causes
})

export const E_BAD_FEATURE = 'BadFeature'
const ErrBadFeature = (node: DirectiveNode, ...causes: Error[]) => ({
  code: E_BAD_FEATURE,
  message: 'bad core feature request',
  nodes: [node],
  causes
})

export default class Core {
  public static graphql(parts: TemplateStringsArray, ...replacements: any[]) {
    return Core.fromSource(
      new Source(String.raw.call(null, parts, ...replacements), 'inline graphql'))
  }

  public static fromSource(source: Source) {
    return new Core(parse(source.body), source)
  }

  get document() { return this._document }
  private _document: DocumentNode

  public get schemaDefinition() { return this._schema }
  private _schema: SchemaDefinitionNode | null = null

  private _features: Features
  get features(): ReadonlyFeatures { return this._features }

  constructor(document: DocumentNode, public readonly source?: Source) {
    this._document = document
    this._features = new Features
    this.bootstrap()
  }

  public readonly errors: GraphQLError[] = []  
  protected report = <P extends GraphQLErrorProps>(...errors: P[]) => {
    for (const error of errors)
      this.errors.push(toGraphQLError({ source: this.source, ...error }))
  }

  private bootstrap() {
    this._schema = this.findTheSchema()
    this.collectFeatures()
  }

  private findTheSchema() {
    let schema = null
    for (const def of this.document.definitions) {
      if (def.kind === 'SchemaDefinition') {
        if (!schema)
          schema = def
        else
          this.report(ErrExtraSchema(def))
      }
    }
    if (!schema) {
      this.report(ErrNoSchema)
      return null
    }
    return schema
  }

  private collectFeatures() {
    const schema = this._schema
    if (!schema) return
    const noCoreErrors = []
    let coreFeature: Feature | null = null
    const features = this._features
    for (const d of schema.directives || []) {
      if (!coreFeature) try {
        const candidate = getArgumentValues($core, d)
        if (CORE_VERSIONS[candidate.feature as keyof typeof CORE_VERSIONS] &&
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
    if (!coreFeature) this.report(ErrNoCore(noCoreErrors))
    this.report(...features.validate())
  }
}


const CORE_VERSIONS = {
  'https://specs.apollo.dev/core/v0.1': true,
  'https://specs.apollo.dev/core/v0.2': true,
}

const Purpose = new GraphQLEnumType({
  name: 'core__Purpose',
  values: {
    SECURITY: {},
    EXECUTION: {},
  }
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

// import {inspect} from 'util'

// const s = Core.fromSource(new Source(`
// schema
//   @core(feature: "https://specs.apollo.dev/core/v0.2")
//   @core(feature: "https://somewhere.com/else/v1.2", for: EXECUTION)
//   @core(feature: "https://somewhere.com/else/v1.3", for: EXECUTION)
// {
//   query: Query
// }
// `, 'anonymousz.graphql'))

// console.log(inspect(s.features, false, 6))
// s.errors.forEach(e => console.log(printError(e)))
// console.log(s.source?.name)

// console.log(s.features.find('https://somewhere.com/else/v1.0'))

// for (const f of s.features) {
//   console.log(f)
// }
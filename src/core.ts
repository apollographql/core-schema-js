import { DocumentNode, GraphQLDirective, GraphQLEnumType, GraphQLError, GraphQLNonNull, GraphQLString, SchemaDefinitionNode, parse, DirectiveNode } from 'graphql'
import { getArgumentValues } from 'graphql/execution/values'
import FeatureUrl from './feature-url'
import { asString, AsString } from './is'

export default class Core {
  public static parse(...input: AsString) {
    const src = asString(input)
    return new Core(parse(src))
  }

  get document() { return this._document }
  private _document: DocumentNode

  constructor(document: DocumentNode) {
    this._document = document
    this.bootstrap()    
  }

  public readonly errors: GraphQLError[] = []  
  report(...errors: GraphQLError[]) {
    this.errors.push(...errors)
  }


  public get schemaDefinition() { return this._schema }
  private _schema: SchemaDefinitionNode | null = null

  get features() { return this._features }
  private _features: Map<string, Feature> = new Map

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
          this.report(new GraphQLError('extra schema definition', def))
      }
    }
    if (!schema) {
      this.report(new GraphQLError('no schema definition', this.document))
      return null
    }
    return schema    
  }

  private collectFeatures() {
    const schema = this._schema
    if (!schema) return
    const parseErrors = []
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
          features.set(candidate.feature, coreFeature)
          continue
        }
      } catch (err) {
        parseErrors.push(err)
      }

      if (coreFeature && d.name.value === coreFeature.name) try {
        const values = getArgumentValues($core, d)
        const url = FeatureUrl.parse(values.feature)
        features.set(values.feature, {
          url,
          name: values.as ?? url.name,
          purpose: values.for,
          directive: d
        })
      } catch (err) {
        this.report(err)
      }
    }
    if (!coreFeature) this.report(...parseErrors)
  }

}

interface Feature {
  url: FeatureUrl
  name: string
  purpose?: 'SECURITY' | 'EXECUTION'
  directive: DirectiveNode
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

const s = Core.parse `
schema
  @core(feature: "https://specs.apollo.dev/core/v0.1")
  @core(feature: "https://somewhere.com/else/v1.0", for: EXECUTION)
{
  query: Query
}
`

console.log(s.features)
console.log(s.errors)
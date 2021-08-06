import { ASTNode, DirectiveNode, DocumentNode, GraphQLDirective, GraphQLEnumType, GraphQLNonNull, GraphQLString, parse, SchemaDefinitionNode, Source, visit } from 'graphql'
import { getArgumentValues } from 'graphql/execution/values'
import { DefinitionNode, NameNode } from 'graphql/language/ast'
import { CoreFn, Context, Const } from './core'
import { Editor } from './edit'
import { err } from './error'
import FeatureUrl from './feature-url'
import Features, { Feature } from './features'
import { hasDirectives, hasName, isAst, isDefinition } from './is'
import { getPrefix } from './names'

export const ErrExtraSchema = (def: SchemaDefinitionNode) =>
  err('ExtraSchema', {
    message: 'extra schema definition ignored',
    schemaDefinition: def,
    nodes: [def]
  })

export const ErrNoSchema = () =>
  err('NoSchema', 'no schema definitions found')

export const ErrNoCore = (causes: Error[]) =>
  err('NoCore', {
    message: 'no core feature found',
    causes
  })

export const ErrBadFeature = (node: DirectiveNode, ...causes: Error[]) =>
  err('BadFeature', {
    message: 'bad core feature request',
    directive: node,
    nodes: [node],
    causes
  })

export const ErrOverlappingNames = (name: string, features: Feature[]) =>
  err('OverlappingNames', {
    message: `the name "${name}" is defined by multiple features`,
    name,
    features,
    nodes: features.map(f => f.directive).filter(Boolean) as DirectiveNode[]
  })


export class Schema extends Const<DocumentNode> {
  public static graphql(parts: TemplateStringsArray, ...replacements: any[]) {
    return this.fromSource(
      new Source(String.raw.call(null, parts, ...replacements), '(inline graphql)'))
  }

  public static fromSource(source: Source) {
    return new this(parse(source))
  }

  get document(): DocumentNode { return this.data }

  get namedChildren(): Map<string, readonly DefinitionNode[]> {
    return this.get(namedDefinitions)
  }

  editor(): Editor<this> {
    return new Editor(this)
  }

  edit(perform: (editor: Editor<this & Context>) => void): this {
    return this.get(core => {
      const editor = core.editor()
      perform(editor as Editor<this & Context>)
      return editor.apply()
    })
  }
}

export class CoreSchema extends Schema {
  public static graphql(parts: TemplateStringsArray, ...replacements: any[]): CoreSchema {
    return super.graphql(parts, ...replacements) as CoreSchema
  }

  public static fromSource(source: Source): CoreSchema {
    return super.fromSource(source) as CoreSchema
  }

  check(...fns: CoreFn<this>[]): this {
    if (!fns.length) fns = [features, namespaces]
    return super.check(...fns)
  }

  get schema(): SchemaDefinitionNode { return this.get(schema) }
  get features(): Features { return this.get(features) }
  get namespaces(): Map<string, Feature> { return this.get(namespaces) }

  *read(directive: GraphQLDirective | FeatureUrl | string, node: ASTNode): Generator<Item, void, unknown> {
    const url =
      directive instanceof FeatureUrl ? directive
      : typeof directive === 'string' ? FeatureUrl.parse(directive)
      : FeatureUrl.parse(directive.extensions?.specifiedBy)  
    const name = this.features.documentName(url)
    const feature = this.features.find(url)
    const match = url.isDirective
      // if we were given a directive url, match exactly that directive
      ? (dir: DirectiveNode) => dir.name.value === name
      // if we were given a feature url, collect all directives from
      // that feature
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
          canonicalName: feature?.canonicalName(d)!,
        }
        if (data != null) item.data = data
        yield item
      }
    }
  }

  featureFor(node: ASTNode): Feature | undefined {
    if (!hasName(node)) return  
    const [prefix] = getPrefix(node.name.value)
    if (prefix || isAst(node, 'Directive', 'DirectiveDefinition')) {      
      return this.namespaces.get(prefix ?? node.name.value)
    }
    return
  }
}

export default CoreSchema

export function schema(this: CoreSchema & Context): SchemaDefinitionNode {
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

export function features(this: CoreSchema & Context): Features {
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

export function namespaces(this: CoreSchema & Context): Map<string, Feature> {
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

export function references(this: Schema & Context): Map<string, ASTNode[]> {
  this.pure(this.document)
  const output: Map<string, ASTNode[]> = new Map
  visit(this.document, {
    NamedType(node) {
      const existing = output.get(node.name.value)
      if (existing) {
        existing.push(node)
        return
      }
      output.set(node.name.value, [node])
      return
    }    
  })
  return output
}

export function namedDefinitions(this: Schema & Context): Map<string, readonly DefinitionNode[]> {
  this.pure(this.document)
  return groupByName(this.document.definitions)
}

export function groupByName<N extends ASTNode & { name?: NameNode }>(nodes: readonly N[]): Map<string, readonly N[]> {
  const output: Map<string, N[]> = new Map
  for (const node of nodes) {
    if (!hasName(node)) continue
    const existing = output.get(node.name?.value)
    if (existing) {
      existing.push(node)
      continue
    }
    output.set(node.name.value, [node])    
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

import { err, GraphQLErrorProps } from './error'

interface Ok<D> {
  data: D
  errors: never
}
interface HasErrors<D> {
  data?: D
  errors: Error[]
}

type Result<D> = Ok<D> | HasErrors<D>

export type CoreFn<C extends Core<any>> = (this: Immutable<C> & Context, core: Immutable<C> & Context) => any
export type Immutable<T> = Omit<T, 'update'>

export interface Context {
  gate(...passIfChanged: any[]): void
  report(...errors: Error[]): void
}

export const ErrNoLayerData = (causes?: Error[]) =>
  err('NoLayerData', {
    message: 'no layer data',
    causes
  })

export const ErrEvalStackEmpty = () =>
  err('EvalStackEmpty', {
    code: 'EvalStackEmpty',
    message: 'this method must only be called from an evaluator, during evaluation. no evaluation is ongoing.'  
  })

export const ErrCheckFailed = (causes: Error[]) =>
  err('CheckFailed', {
    message: 'one or more checks failed',
    causes
  })

export class Core<T> {
  constructor(data: T) {
    this._data = data
  }

  get data() { return this._data }

  get<F extends CoreFn<this>>(fn: F): ReturnType<F> {
    const cell = this.getCell(fn)
    this.evaluate(cell, fn)
    if (!cell.result) { throw ErrNoLayerData() }
    if (cell.result.data === undefined) {
      if (cell.result.errors?.length === 1) throw cell.result.errors[0]
      throw ErrNoLayerData(cell.result.errors)
    }
    return cell.result.data
  }
  
  try<F extends CoreFn<this>>(fn: F): ReturnType<F> | undefined {
    const cell = this.getCell(fn)
    this.evaluate(cell, fn)
    return cell.result?.data
  }

  getResult<F extends CoreFn<this>>(fn: F): Result<ReturnType<F>> {
    const cell = this.getCell(fn)
    let result: Result<ReturnType<F>> = { errors: [] }
    this.trace(() => {
      this.evaluate(cell, fn)
      result.data = cell.result?.data
    }, (event, _fn, cellResult) => {
      if (event === 'end' && cellResult && cellResult.errors)
        result.errors = result.errors.concat(cellResult.errors)
    })
    return result
  }

  check(...fns: CoreFn<this>[]): this {
    let errors: Error[] = []
    this.trace(() => {
      for (const fn of fns) this.try(fn)      
    }, (event, _fn, cellResult) => {
      if (event === 'end' && cellResult && cellResult.errors)
        errors = errors.concat(cellResult.errors)
    })
    if (!errors.length) return this
    throw ErrCheckFailed(errors)
  }

  update(update: (data: T) => T) {
    this._data = update(this.data)
  }

  protected gate(...passIfChanged: any[]) {
    const {currentCell} = this
    currentCell.gate(...passIfChanged)
  }

  protected report(...errors: Error[]) {
    const {currentCell} = this
    for (const error of errors)
      currentCell.report(error)
  }

  protected get currentCell(): Cell {
    const top = this._stack[this._stack.length - 1]
    if (!top) throw ErrEvalStackEmpty()
    return top
  }

  protected get currentTracer(): TraceCallback | undefined {
    return this._traceStack[this._traceStack.length - 1]
  }

  protected trace(block: () => any, onEvent: TraceCallback) {
    this._traceStack.push(onEvent)
    try {      
      block()
    } finally {
      this._traceStack.pop()
    }
  }

  private evaluate<F extends CoreFn<this>>(cell: Cell, fn: F) {
    const tracer = this.currentTracer
    this._stack.push(cell)
    try {
      try {
        if (tracer) tracer('begin', fn, cell.result)
        cell.evaluate(this as any, fn as any)
      } finally {
        if (tracer) tracer('end', fn, cell.result)
      }
    } finally {
      this._stack.pop()
    }
  }

  private getCell<F extends CoreFn<this>>(fn: F): Cell {
    const existing = this._cells.get(fn)
    if (existing) return existing
    const created = new Cell
    this._cells.set(fn, created)
    return created
  }

  private _cells: WeakMap<CoreFn<this>, Cell> = new WeakMap
  private _stack: Cell[] = []
  private _traceStack: TraceCallback[] = []

  private _data: T
}

export default Core

export const ROLLBACK = Object.freeze({ ROLLBACK: true })
class Cell {
  gate(...changed: any[]) {
    const index = this._nextGuard++
    const existing = this._guards[index]
    try {
      if (!existing) return
      if (existing.length !== changed.length) return
      let i = existing.length; while (i --> 0) {
        if (existing[i] !== changed[i]) return
      }
      throw ROLLBACK
    } finally {
      this._guards[index] = changed
    }
  }

  report(error: Error) {
    const pending = this._pendingResult
    if (!pending)
      throw new Error('cell is not being evaluated')
    pending.errors = pending.errors ?? []
    pending.errors.push(error)
  }

  evaluate<C extends Core<any> & Context, F extends CoreFn<C>>(core: C, fn: F) {
    const pending = {} as any
    this._pendingResult = pending
    const lastStatus = this.status
    this.status = 'run'
    this._nextGuard = 0
    let rollback = false
    try {
      pending.data = fn.call(core, core)
    } catch(err) {
      if (err === ROLLBACK) {
        rollback = true
      } else {
        this.report(err) 
      }
    } finally {
      this._nextGuard = 0
      if (!rollback) {
        this.result = pending
        this.status = 'ready'
      } else {
        this.status = lastStatus
      }
      this._pendingResult = undefined
    }
  }
  
  status: 'empty' | 'run' | 'ready' = 'empty'

  result: Result<any> | undefined = undefined
  private _pendingResult: Result<any> | undefined = undefined
  private _guards: any[][] = []
  private _nextGuard = 0
}

type TraceCallback = (event: 'begin' | 'end', fn: CoreFn<any>, result?: Result<any>) => void




// const x = CoreSchema.graphql `
// schema @core(feature: "https://specs.apollo.dev/core/v0.2")
//   { query: Query }
// type User { field: Int }
// `
// console.log(x.get(schemaDefinition))
// console.log(x.try(features))
// try {
//   x.check(features)
// } catch(err) { console.log(err.toString()) }


// export class XCoreSchema implements ReadonlyCore {
//   public static graphql(parts: TemplateStringsArray, ...replacements: any[]) {
//     return CoreSchema.fromSource(
//       new Source(String.raw.call(null, parts, ...replacements), 'inline graphql'))
//   }

//   public static fromSource(source: Source) {
//     return new CoreSchema(parse(source.body), source)
//   }  

//   get document() { return this._document }
//   private _document: DocumentNode
  
//   get<D>(layer: Layer<D>): D {
//     const result = layer(this)
//     const errors = result.errors ?
//       result.errors.map(error => toGraphQLError({ source: this.source, ...error }))
//       : null
//     if (errors) this.errors.push(...errors)

//     if (typeof result.data !== 'undefined')
//       return result.data
//     throw new Error
//   }

//   public get schemaDefinition() { return this._schema }
//   private _schema: SchemaDefinitionNode | undefined

//   private _features: Features
//   get features(): ReadonlyFeatures { return this._features }

//   constructor(document: DocumentNode, public readonly source?: Source) {
//     this._document = document
//     this._features = new Features
//     this.bootstrap()
//   }

//   public readonly errors: GraphQLError[] = []  
//   protected report = <P extends GraphQLErrorProps>(...errors: P[]) => {
//     for (const error of errors)
//       this.errors.push(toGraphQLError({ source: this.source, ...error }))
//   }

//   private bootstrap() {
//     this._schema = this.findTheSchema() ?? undefined
//     this.collectFeatures()
//   }

//   private findTheSchema() {
//     let schema = null
//     for (const def of this.document.definitions) {
//       if (def.kind === 'SchemaDefinition') {
//         if (!schema)
//           schema = def
//         else
//           this.report(ErrExtraSchema(def))
//       }
//     }
//     if (!schema) {
//       this.report(ErrNoSchema)
//       return null
//     }
//     return schema
//   }

//   private collectFeatures() {
//     const schema = this._schema
//     if (!schema) return
//     const noCoreErrors = []
//     let coreFeature: Feature | null = null
//     const features = this._features
//     for (const d of schema.directives || []) {
//       if (!coreFeature) try {
//         const candidate = getArgumentValues($core, d)
//         if (CORE_VERSIONS[candidate.feature as keyof typeof CORE_VERSIONS] &&
//             d.name.value === (candidate.as ?? 'core')) {
//           const url = FeatureUrl.parse(candidate.feature)
//           coreFeature = {
//             url,
//             name: candidate.as ?? url.name,
//             directive: d
//           }
//         }
//       } catch (err) {
//         noCoreErrors.push(err)
//       }

//       if (coreFeature && d.name.value === coreFeature.name) try {
//         const values = getArgumentValues($core, d)
//         const url = FeatureUrl.parse(values.feature)
//         features.add({
//           url,
//           name: values.as ?? url.name,
//           purpose: values.for,
//           directive: d
//         })
//       } catch (err) {
//         this.report(ErrBadFeature(d, err))
//       }
//     }
//     if (!coreFeature) this.report(ErrNoCore(noCoreErrors))
//     this.report(...features.validate())
//   }
// }


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
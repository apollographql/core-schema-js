import { err } from './error'
interface Ok<D> {
  data: D
  errors: never
}
interface HasErrors<D> {
  data?: D
  errors: Error[]
}

type Result<D> = Ok<D> | HasErrors<D>

export type CoreFn<C extends Core<any>> = 
  ((this: C & Context, core: C & Context) => any) |
  { forCore(core: C & Context): any }

export type Return<F extends CoreFn<any>> =
  F extends { forCore(...args: any): infer R } ? R
  : F extends (...args: any) => infer R ? R
  : never

export interface Context {
  /**
   * Declare that the remainder of evaluation is a pure function of the provided arguments.
   * 
   * If the core function has never been evaluated before, this does nothing.
   * Otherwise, the provided values are shallowly compared to the previous values. If they
   * are identical, `pure` throws `ROLLBACK`, immediately halting evaluation and instructing
   * the processor to use the previously stored value.
   * 
   * `pure` can be called multiple times, but must be called deterministically and in the
   * same order (ala a react hook).
   * 
   * @param passIfChanged arguments to compare
   */
  pure(...passIfChanged: any[]): void

  /**
   * Report one or more errors
   * 
   * @param errors errors to report
   */
  report(...errors: Error[]): void
}

export const ErrNoData = (causes?: Error[]) =>
  err('NoData', {
    message: 'no data',
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

export interface Core<T> {
  readonly data: T
  get<F extends CoreFn<this>>(fn: F): Return<F>
  try<F extends CoreFn<this>>(fn: F): Return<F> | undefined
  getResult<F extends CoreFn<this>>(fn: F): Result<Return<F>>
  check(...fns: CoreFn<this>[]): this
  withData(data: T): this
  
  mut(): this & Mutable<T>
}

export interface Mutable<T> {
  update(fn: (data: T) => T): this
}

export class Const<T> implements Core<T> {
  constructor(data: T) {
    this._data = data
  }

  get data() { return this._data }

  get<F extends CoreFn<this>>(fn: F): Return<F> {
    const cell = this.getCell(fn)
    this.evaluate(cell, fn)
    if (!cell.result) { throw ErrNoData() }
    if (cell.result.data === undefined) {
      if (cell.result.errors?.length === 1) throw cell.result.errors[0]
      throw ErrNoData(cell.result.errors)
    }
    return cell.result.data
  }
  
  try<F extends CoreFn<this>>(fn: F): Return<F> | undefined {
    const cell = this.getCell(fn)
    this.evaluate(cell, fn)
    return cell.result?.data
  }

  getResult<F extends CoreFn<this>>(fn: F): Result<Return<F>> {
    const cell = this.getCell(fn)
    let result: Result<Return<F>> = { errors: [] }
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

  withData(data: T) {
    return new (this.constructor as any)(data)
  }

  mut() {
    return this.withData(this.data)
  }

  protected pure(...passIfChanged: any[]) {
    const {currentCell} = this
    currentCell.pure(...passIfChanged)
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

  protected update(fn: (data: T) => T): Mutable<T> {
    this._data = fn(this.data)
    return this as any as Mutable<T>  
  }

  private _cells: WeakMap<CoreFn<this>, Cell> = new WeakMap
  private _stack: Cell[] = []
  private _traceStack: TraceCallback[] = []

  private _data: T
}

export default Core

export const ROLLBACK = Object.freeze({ ROLLBACK: true })
export class Cell {
  pure(...changed: any[]) {
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
      pending.data = call(core, fn)
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

function call<C extends Core<any> & Context, F extends CoreFn<C>>(core: C, fn: F) {
  if (hasForCore(fn)) {
    return fn.forCore(core)
  }
  return fn.call(core, core)
}

const hasForCore = (o: any): o is { forCore(core: any): any } =>
  typeof o?.forCore === 'function'

type TraceCallback = (event: 'begin' | 'end', fn: CoreFn<any>, result?: Result<any>) => void

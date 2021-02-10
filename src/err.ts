import { ASTNode, DocumentNode } from 'graphql'
import { AsString, asString, Maybe } from './is'
import { documentOf, sourceOf } from './linkage'
import sourceMap, { Source, SourceMap } from './source'

/**
 * An Err is an error on a GraphQL document.
 *
 * It is not quite a proper JS error; notably, it does not extend Error,
 * so constructing one doesn't require cutting a stack trace. This makes Errs
 * cheap to create, which is desirable for functions like deserializers, which
 * are expected to fail with some frequency. Deserialize<T> returns Result<T>,
 * which can be either Ok<T> or Err.
 *
 * If you want to throw an Err and get a stack trace, first convert it
 * to a JS error with `.toError`
 */
export interface Err {
  readonly is: 'err',
  readonly code: string
  readonly message: string
  readonly source?: Source
  readonly doc?: Maybe<DocumentNode>
  readonly node?: Maybe<ASTNode>
  readonly causes: (Err | Error)[]
  toString(mapSource?: SourceMap): string
  toError(mapSource?: SourceMap): Error
}

/**
 * Define an Err with a code and message formatter. This returns a function
 * which accepts both any subset of the base Err fields and any new props
 * taken by the formatter.
 *
 * Example:
 *
 * ```
 *   export const ErrBadValue = ERR `BadValue` (
 *     (props: { expected: any, got: any }) =>
 *       `expected ${props.expected} got ${props.got}`
 *   )
 *
 *   ...
 *
 *   return ErrBadValue({ expected: 5, got: 99, node: someNode })
 * ```
 * @param code error code
 */
export default function ERR(...code: AsString) {
  const codeStr = asString(code)
  return createWithFormatter

  function createWithFormatter<F extends MsgFn>(fmt: F): CreateErr<F> {
    const proto = Object.create(BASE, {
      code: {
        get() { return codeStr }
      },
      message: {
        get() {
          return fmt.apply(this, [this] as any)
        }
      }
    })
    return Object.assign(
      (props: any, ...causes: any[]) =>
        Object.assign(Object.create(proto),
          props.node ? {
            source: sourceOf(props.node),
            doc: documentOf(props.node),
          } : {},
          props, { causes }),
      { code: codeStr })
  }
}

export type MsgFn = (props?: any) => string

export interface CreateErr<F extends MsgFn> {
  readonly code: string
  (input?: Fn_PropsOf<F> & Partial<Err>, ...causes: (Err | Error)[]): Err & Fn_PropsOf<F>
}

type Fn_PropsOf<F extends MsgFn>
  = F extends (props: infer P) => any
    ? P
    :
    F extends () => any    
    ? {}
    :
    never

export interface Ok<T> {
  is: 'ok'
  ok: T
  node: Maybe<ASTNode>
}

export function ok<T>(ok: T, node?: Maybe<ASTNode>) {
  return {
    is: 'ok' as 'ok',
    ok,
    node
  }
}

export type Result<T> = Ok<T> | Err
export type OkTypeOf<R extends Result<any>> = R extends Result<infer T> ? T : never

export function isErr(o: any): o is Err {
  return o?.is === 'err'
}

export function isOk<T>(o: any): o is Ok<T> {
  return o?.is === 'ok'
}

/**
 * Wrap a function which returns T with a new function on the same parameters
 * returning Result<T>
 *
 * @param fn the function to wrap
 */
export function asResultFn<F extends (...args: any) => any>(fn: F) {
  return apply

  function apply(...args: Parameters<F>): Result<ReturnType<F>> {
    try {
      return ok(fn.apply(null, args))
    } catch(error) {
      const err = Object.create(FROM_ERROR)
      err.causes = [error]
      return err
    }
  }
}

/**
 * Sift an array of Result<T>s into all the errors and unwrapped
 * results, returning [Err[], T[]]
 *
 * @param results
 */
export function siftValues<T>(results: Result<T>[]): [Err[], T[]] {
  const okays: T[] = [], errors: Err[] = []
  for (const r of results) {
    if (isOk(r))
      okays.push(r.ok)
    else
      errors.push(r as Err)
  }
  return [errors, okays]
}


/**
 * Sift an array of Result<T>s into all the errors and Ok results,
 * returning [Err[], Ok<T>[]]
 *
 * @param results
 */
export function siftResults<T>(results: Result<T>[]): [Err[], Ok<T>[]] {
  const okays: Ok<T>[] = [], errors: Err[] = []
  for (const r of results) {
    if (isOk(r))
      okays.push(r as Ok<T>)
    else
      errors.push(r as Err)
  }
  return [errors, okays]
}

const BASE = { is: 'err', toString, causes: Object.freeze([]), toError }
const FROM_ERROR = Object.create(BASE, {
  message: {
    get() {
      return this.causes[0]?.message
    }
  },
  code: {
    get() {
      return this.causes[0]?.code ?? 'UnknownError'
    }
  },
})

function toString(this: Err, mapSource: SourceMap = sourceMap(this.source)) {
  let str = `[${this.code ?? 'UNKNOWN'}] ${mapSource(this.node?.loc)}: ${this.message}`
  for (const cause of this.causes) {
    str += '\n  - ' + cause.toString(mapSource).split('\n').join('\n    ')
  }
  return str
}

function toError(this: Err, mapSource: SourceMap = sourceMap(this.source)) {
  const error = new Error(this.toString(mapSource))
  Object.assign(error, this)
  return error
}

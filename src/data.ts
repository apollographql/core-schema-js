import { asString, AsString } from './is'

const getValue = Symbol('Get column value')
const setValue = Symbol('Set column value')

export interface Set<T, S=any> {
  [setValue]: SetFn<T, S>
}

export interface Get<T, S=any, Default=undefined> {
  [getValue]: GetFn<T, S, Default>
}

export type Data<T, S=any, Default=undefined>
  = Get<T, S, Default> & Set<T, S>

export interface SetFn<T, S=any> {
  (source: S, value: T): void
}

export interface GetFn<T, S=any, Default=undefined> {
  <D=Default>(source: S, defaultValue: D): T | D
  (source: S): T | Default
}

type Set_TypeOf<S extends Set<any>>
  = S extends Set<infer T>
    ? T
    : never

type Get_DefaultTypeOf<G extends Get<any, any, any>>
  = G extends Get<any, any, infer D>
    ? D
    : never

type Get_ReturnTypeOf<G extends Get<any, any, any>>
  = G extends Get<infer T, any, infer D>
    ? T | D
    : never

export function col<T, S=any>(...desc: AsString): Get<T, S> & Set<T, S> {
  const description = asString(desc)
  const symbol = Symbol(description)
  return {
    [getValue]: (source: S, defaultValue?: any) =>
      (source &&
        typeof source === 'object' &&
        symbol in source) ? (source as any)[symbol] : defaultValue,
    [setValue]: (source: S, value: T) =>
      (source as any)[symbol] = value,
  }
}

export function data<T, S=any>(...desc: AsString): Get<T, S> & Set<T, S> & GetFn<T, S> {
  const column = col <T, S> (...desc)
  return Object.assign(column[getValue], column)
}

const NotFound = {}
export function derive<T, S=any>(...desc: AsString) {
  const column = col(...desc)
  return (fn: (source: S) => T): Get<T, S, T> & GetFn<T, S, T> => {
    const resolver = {
      [getValue]: (source: S) => {
        const existing = column[getValue](source, NotFound)
        if (existing !== NotFound) return existing as T
        const created = fn(source)
        column[setValue](source, created)
        return created as T
      }
    }
    return Object.assign(resolver[getValue], resolver)
  }
}

export function set<S, Col extends Set<any, S>>(
  source: S,
  col: Col,
  value: Set_TypeOf<Col>
) {
  col[setValue](source, value)
}

export function get<S, Col extends Get<any, S>, D=Get_DefaultTypeOf<Col>>(
  source: S,
  col: Col,
  defaultValue?: D
): Get_ReturnTypeOf<Col> {
  return col[getValue](source, defaultValue)
}

export function withGet<B, Col extends Get<any, any>>(base: B, col: Col): B & Col {
  (base as any)[getValue] = col[getValue]
  return base as any
}

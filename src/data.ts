import { asString, AsString } from './is'

const read = Symbol('Get column value')
const write = Symbol('Set column value')

export interface Read<T, S=any, Default=undefined> {
  [read]: ReadFn<T, S, Default>
}

export interface Write<T, S=any> {
  [write]: WriteFn<T, S>
}

export type Data<T, S=any, Default=undefined>
  = Read<T, S, Default> & Write<T, S>

export interface ReadFn<T, S=any, Default=undefined> {
  <D=Default>(source: S, defaultValue: D): T | D
  (source: S): T | Default
}
  
export interface WriteFn<T, S=any> {
  (source: S, value: T): void
}

type Write_TypeOf<S extends Write<any>>
  = S extends Write<infer T>
    ? T
    : never

type Read_DefaultOf<G extends Read<any, any, any>>
  = G extends Read<any, any, infer D>
    ? D
    : never

type Read_ValueOf<G extends Read<any, any, any>>
  = G extends Read<infer T, any, infer D>
    ? T | D
    : never

export function col<T, S=any>(...desc: AsString): Read<T, S> & Write<T, S> {
  const description = asString(desc)
  const symbol = Symbol(description)
  return {
    [read]: (source: S, defaultValue?: any) =>
      (source &&
        typeof source === 'object' &&
        symbol in source) ? (source as any)[symbol] : defaultValue,
    [write]: (source: S, value: T) =>
      (source as any)[symbol] = value,
  }
}

export function data<T, S=any>(...desc: AsString): Read<T, S> & Write<T, S> & ReadFn<T, S> {
  const column = col <T, S> (...desc)
  return Object.assign(column[read], column)
}

const NotFound = Object.freeze({})
export function derive<T, S=any>(...desc: AsString) {
  const column = col(...desc)
  return (fn: (source: S) => T): Read<T, S, T> & ReadFn<T, S, T> => {
    const resolver = {
      [read]: (source: S) => {
        const existing = column[read](source, NotFound)
        if (existing !== NotFound) return existing as T
        const created = fn(source)
        column[write](source, created)
        return created as T
      }
    }
    return Object.assign(resolver[read], resolver)
  }
}

export function set<S, Col extends Write<any, S>>(
  source: S,
  col: Col,
  value: Write_TypeOf<Col>
) {
  col[write](source, value)
}

export function get<S, Col extends Read<any, S>, D=Read_DefaultOf<Col>>(
  source: S,
  col: Col,
  defaultValue?: D
): Read_ValueOf<Col> {
  return col[read](source, defaultValue)
}

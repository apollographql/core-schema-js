const read = Symbol('Get column value')
const write = Symbol('Set column value')

export interface Read<V, S=any, Default=undefined> {
  [read]: ReadFn<V, S, Default>
}

export interface Write<V, S=any> {
  [write]: WriteFn<V, S>
}

export type Data<V, S=any, Default=undefined>
  = Read<V, S, Default> & Write<V, S>

export interface ReadFn<V, S=any, Default=undefined> {
  <D=Default>(source: S, defaultValue: D): V | D
  (source: S): V | Default
}
  
export interface WriteFn<V, S=any> {
  (source: S, value: V): void
}

type Write_TypeOf<W extends Write<any>>
  = W extends Write<infer T>
    ? T
    : never

type Read_DefaultOf<R extends Read<any, any, any>>
  = R extends Read<any, any, infer D>
    ? D
    : never

type Read_ValueOf<R extends Read<any, any, any>>
  = R extends Read<infer T, any, infer D>
    ? T | D
    : never

export function col<T, S=any>(description: string): Read<T, S> & Write<T, S> {
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

export function data<T, S=any>(description: string):
  Read<T, S> & Write<T, S> & ReadFn<T, S>
{
  const column = col <T, S> (description)
  return Object.assign(column[read], column)
}

const NotFound = Object.freeze({})
export function derive<T, S=any>(
  description: string,
  fn: (source: S) => T
): Read<T, S, T> & ReadFn<T, S, T>
{
  const column = col <T, S> (description)
  const derived = {
    [read]: (source: S) => {
      const existing = column[read](source, NotFound)
      if (existing !== NotFound) return existing as T
      const created = fn(source)
      column[write](source, created)
      return created as T
    }
  }
  return Object.assign(derived[read], derived)
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

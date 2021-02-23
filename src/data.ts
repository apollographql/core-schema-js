const read = Symbol('Get column value')
const write = Symbol('Set column value')

export interface Read<V, S=any, Default=undefined> {
  [read]: ReadFn<V, S, Default>
}

export interface Write<V, S=any> {
  [write]: WriteFn<V, S>
}

export interface ReadFn<V, S=any, Default=undefined> {
  <D=Default>(source: S, defaultValue: D): V | D
  (source: S): V | Default
}

export interface WriteFn<V, S=any> {
  (source: S, value: V): void
}

type Write_ValueOf<W extends Write<any>>
  = W extends Write<infer V>
    ? V
    : never

type Read_DefaultOf<R extends Read<any, any, any>>
  = R extends Read<any, any, infer D>
    ? D
    : never

type Read_ValueOf<R extends Read<any, any, any>>
  = R extends Read<infer V, any, infer D>
    ? V | D
    : never

/**
 * Define mutable data on arbitrary objects, returning an accessor for the
 * data.
 * 
 * If the data can be computed as function of the object and is not expected
 * to change across the lifetime of the object—but you nevertheless want
 * to cache it—use `derive` instead.
 * 
 * Example:
 * 
 * ```
 *   const theMessage = data <string> ('message')
 *   const someObject = {}
 *   set(someObject, theMessage, 'hello world')
 *   theMessage(someObject)      // -> 'hello world'
 *   // or with get():
 *   get(someObject, theMessage) // -> 'hello world'
 *   // retrieving with a default value:
 *   theMessage({
 *     // new object, so no message set
 *   }, 'default message')       // -> 'default message'
 * ```
 * 
 * JS of course lets you define mutable data on arbitrary objects by just
 * throwing that data into some ad-hoc property. Doing this interacts awkwardly
 * with typings: TypeScript does not know about ad-hoc properties, so you
 * usually have to write functions checking for and/or extracting
 * these ad-hoc fields. Additionally, if you use standard string properties,
 * you run the risk of name collisions. Using symbols for properties removes
 * this risk, but then you have to pass the symbol around, generally
 * with an associated accessor function.
 * 
 * "Passing around a symbol with an associated accessor function" is basically
 * what `data` does. Internally, `data` creates a `symbol` with the provided
 * `description` and returns an accessor which looks up the symbol on any `source`
 * object it's called with, returning the value stored on the object.
 * 
 * Symbols properties are ignored during JSON serialization, so this can also
 * be used to add cyclic references to objects while maintaining their
 * serializability.
 * 
 * @param description 
 * @returns 
 */
export function data<V, S=any>(description: string):
  Read<V, S> & Write<V, S> & ReadFn<V, S>
{
  const column = col <V, S> (description)
  return Object.assign(column[read], column)
}

/**
 * Define lazily-computed derived data on arbitrary objects.
 * 
 * Example:
 * 
 * ```
 *   const nullishCount = derive <number, readonly any[]>
 *     ('count of nullish items', array => array.filter(e => e == null).length)
 *   const items = [0, 1, null, 2, undefined, 3]
 *   nullishCount(items)      // -> 2
 *   // or with get():
 *   get(items, nullishCount) // -> 2
 * ```
 * 
 * `derive` memoizes unary functions on objects. Internally, it
 * creates a symbol with the provided description and returns an accessor
 * function which:
 *   (1) looks up the symbol on the object it's called with, returning
 *       the previously stored value (if any)
 *   (2) if no value is stored, calls the provided function to generate it, storing
 *       and returning the result
 * 
 * You can use `derive` to cache the results of potentially-expensive computations
 * whose results are expected to be stable across the lifetime of the object. `derive`
 * provides no mechanism to force recalculation, so you should *not* use it if the
 * results may change after the first time they're computed (i.e. because the object
 * was mutated).
 * 
 * @param description description for the symbol
 * @param fn derivation function
 * @returns an accessor for the derived data
 */
export function derive<F extends (source: any) => any>(
  description: string,
  fn: F
): F & Read<ReturnType<F>, Parameters<F>[0], ReturnType<F>>
{
  type V = ReturnType<F>
  type S = Parameters<F>[0]
  const column = col <V, S> (description)
  const derived = {
    [read]: (source: S) => {
      const existing = column[read](source, NotFound)
      if (existing !== NotFound) return existing as V
      const created = fn(source)
      column[write](source, created)
      return created as V
    }
  }
  return Object.assign(derived[read], derived) as F & Read<V, S, V>
}
const NotFound = Object.freeze({})


export function set<S, Col extends Write<any, S>>(
  source: S,
  col: Col,
  value: Write_ValueOf<Col>
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

function col<V, S=any>(description: string): Read<V, S> & Write<V, S> {
  const symbol = Symbol(description)
  return {
    [read]: (source: S, defaultValue?: any) =>
      (source &&
        typeof source === 'object' &&
        symbol in source) ? (source as any)[symbol] : defaultValue,
    [write]: (source: S, value: V) =>
      (source as any)[symbol] = value,
  }
}

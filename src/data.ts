import { asString, AsString } from './is'

const getValue = Symbol('Get column value')
const setValue = Symbol('Set column value')

export interface Set<T, S=any> {
  [setValue]: SetValue<T, S>
}

export interface Get<T, S=any, Default=undefined> {
  [getValue]: GetValue<T, S, Default>
}

export type Data<T, S=any, Default=undefined>
  = Get<T, S, Default> & Set<T, S>

export interface SetValue<T, S=any> {
  (source: S, value: T): void  
}

export interface GetValue<T, S=any, Default=undefined> {
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

export function data<T, S=any>(...desc: AsString): Get<T, S> & Set<T, S> & GetValue<T, S> {
  const column = col <T, S> (...desc)
  return Object.assign(column[getValue], column)
}

const NotFound = {}
export function derive<T, S=any>(...desc: AsString) {
  const column = col(...desc)
  return (fn: (source: S) => T): Get<T, S, T> & GetValue<T, S, T> => {
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

// /**
//  * A Datum<D, T> describes some arbitrary data D attached to some type T, which
//  * must be an object (default: object).
//  */
// export interface Data<D, T=any> {
//   /**
//    * Access the data from `target`
//    */
//   (target: T): D
// }

// export interface MaybeData<D, T=any> {
//   /**
//    * Access the data from `target`
//    */
//   (target: T): D | undefined

//   /**
//    * Returns a new accessor for the same underlying data. The returned accessor
//    * will call the provided `setWith` with `target` if the datum does not
//    * already exist on `target`, save the result on `target`, and return it.
//    */
//   orElse(setWith: (target: T) => D): Data<D, T>
// }

// export type DataValueOf<D extends Data<any>> = D extends Data<infer V> ? V : never

// export type Description = Template | [string]

// const internal = {
//   write: Symbol('write')
// }

// export default data

// export function data<D, T=any>(...description: AsString): MaybeData<D, T> {
//   const name = asString(description)
//   const symbol = Symbol(name)
//   return Object.assign(get, {
//     set,
//     orElse,
//     [internal.write]: write,
//   })

//   function get(target: T): D {
//     return (target as any)[symbol]
//   }

//   function write(target: T, data: D) {
//     (target as any)[symbol] = data
//   }

//   function orElse(setWith: (target: T) => D) {
//     return Object.assign(getWithDefault, {
//       set,
//       [internal.write]: write,
//     })

//     function getWithDefault(target: T) {
//       if (symbol in target) return get(target)
//       const value = setWith(target)
//       write(target, value)
//       return value
//     }
//   }
// }


// export function set<T extends object, C extends Data<any, T>>(
//   target: T,
//   column: C,
//   value: DataValueOf<C>): T
// {
//   (column as any)[internal.write](target, value)
//   return target
//   // return {
//   //   mut: 'set' as 'set',
//   //   target,
//   //   data: column,
//   //   value
//   // }
// }

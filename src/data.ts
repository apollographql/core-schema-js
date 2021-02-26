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
): F
{
  type V = ReturnType<F>
  type S = Parameters<F>[0]
  const symbol = Symbol(description)
  return ((source: S): V => {
    const exists = (source &&
       typeof source === 'object' &&
       symbol in source)
    if (exists) return source[symbol] as V
    const created = fn(source) as V
    source[symbol] = created
    return created
  }) as F
}

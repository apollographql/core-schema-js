export type CreateFn<K, V> = (mut: IScopeMapMut<K, V>) => void

export interface IScopeMap<K, V> {
  /**
   * Return the first value for `key` in this map or any of its
   * (grand)parents. Returns undefined if `key` could not be found.
   * 
   * @param key the key to lookup 
   */
   lookup(key: K): V | undefined

  /**
   * Return the value bound to a key in this scope. If no value
   * is bound locally, return undefined. Does not consult the parent
   * map.
   * 
   * @param key the key to lookup 
   */
  own(key: K): V | undefined

  /**
   * Create and return a child scope.
   * 
   * The child scope will be able to reference all links from the parent
   * scope (this one). Names linked in the child will shadow links in the
   * parent, as per the usual rules of lexical shadowing.
   * 
   * @param createFn 
   */
  child(fn: CreateFn<K, V>): Readonly<ScopeMap<K, V>>

  /**
   * Iterate over this map's own entries (excluding parent entries)
   */
  entries(): Iterable<[K, V]>

  /**
   * Iterate over all entries, including non-shadowed entries
   * from ancestors.
   */
  visible(): Iterable<[K, V]>
}

export interface IScopeMapMut<K, V> extends IScopeMap<K, V> {
  /**
   * Set `key` to `value` in this scope.
   */
  set(key: K, value: V): void
}

export class ScopeMap<K, V> {
  static create<K, V>(fn?: CreateFn<K, V>, parent?: IScopeMap<K, V>): IScopeMap<K, V> {
    const scope = new this<K, V>(parent)
    if (fn) fn(scope as ScopeMap<K, V> & IScopeMapMut<K, V>)
    return Object.freeze(scope)
  }

  static EMPTY = ScopeMap.create<never, any>()

  own(key: K): V | undefined {
    return this.#entries.get(key)
  }

  lookup(key: K): V | undefined {
    return this.own(key) ?? this.parent?.lookup(key)
  }

  child(fn: CreateFn<K, V>): IScopeMap<K, V> {
    return ScopeMap.create(fn, this)
  }

  entries(): Iterable<[K, V]> {
    return this.#entries.entries()
  }

  *visible(): Iterable<[K, V]> {
    const seen = new Set<K>()
    for (const ent of this.entries()) {
      seen.add(ent[0])
      yield ent
    }
    if (this.parent) for (const ent of this.parent.visible()) {
      if (seen.has(ent[0])) continue
      seen.add(ent[0])
      yield ent
    }
  }

  readonly #entries = new Map<K, V>()

  //@ts-ignore — accessible via IScopeMut
  private set(key: K, value: V): void {
    this.#entries.set(key, value)
  }

  protected constructor(public readonly parent?: IScopeMap<K, V>) {}
}

export default ScopeMap
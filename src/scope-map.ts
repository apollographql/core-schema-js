export type CreateFn<V, K> = (mut: Scope<V, K> & IScopeMut<V, K>) => void

export interface IScope<V, K = string | undefined> {
  own(key: K): V | undefined
  lookup(key: K): V | undefined
  child(fn: CreateFn<V, K>): Readonly<Scope<V, K>>
}

export interface IScopeMut<V, K = string | undefined> extends IScope<V, K> {
  set(key: K, value: V): void
}

export class Scope<V, K = string | undefined> {
  static create<V, K = string>(fn?: CreateFn<V, K>, parent?: IScope<V, K>): IScope<V, K> {
    const scope = new this<V, K>(parent)
    if (fn) fn(scope as Scope<V, K> & IScopeMut<V, K>)
    return Object.freeze(scope)
  }

  static EMPTY = Scope.create<never, any>()

  own(key: K): V | undefined {
    return this.entries.get(key)
  }

  lookup(key: K): V | undefined {
    return this.own(key) ?? this.parent?.lookup(key)
  }

  child(fn: CreateFn<V, K>): IScope<V, K> {
    return Scope.create(fn, this)
  }

  private readonly entries = new Map<K, V>()

  //@ts-ignore — accessible via IScopeMut
  private set(key: K, value: V): void {
    this.entries.set(key, value)
  }

  protected constructor(public readonly parent?: IScope<V, K>) {}
}
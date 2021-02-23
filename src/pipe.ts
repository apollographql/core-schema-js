/**
 * Pipe<T> provides fluent-style function composition.
 *
 * Example:
 *
 * ```typescript
 *   Pipe.from(32)
 *     .to(x => x * 2)
 *     .to(value => ({ value }))
 *     .to(obj => `the value is: ${obj.value}`)
 *     .output() // -> "the value is: 64"
 * ```
 *
 * This is mainly nice because it helps with typing. A more-typical `compose(a, b, c...)`
 * function won't be able to check that e.g. the return type of `b` matches the input type
 * of `c`, since TypeScript doesn't currently support any kind of type reduce operation.
 * 
 * Pipes currently evaluate each stage immediately. This may change.
 */
export class Pipe<T> {
  static from<T>(data: T): Pipe<T> {
    return new Pipe(data)
  }

  constructor(private readonly data: T) { }

  into<O extends (arg: this) => any>(op: O): ReturnType<O> {
    return op.apply(null, [this])
  }

  to<O extends (arg: T) => any>(op: O): Pipe<ReturnType<O>> {
    return new Pipe(op(this.data))
  }

  output() { return this.data }
}

export class Pipe<T> {
  static from<T>(data: T): Pipe<T> {
    return new Pipe(data)
  }

  constructor(readonly value: T) { }

  to<O extends (arg: T) => any>(op: O): ReturnType<O> {
    return op.apply(null, [this.value])
  }

  map<O extends (arg: T) => any>(op: O): Pipe<ReturnType<O>> {
    return new Pipe(this.to(op))
  }
}

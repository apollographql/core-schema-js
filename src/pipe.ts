class Pipe<T extends any[]> {
    static from<T extends any[]>(...args: T): Pipe<T> {
        return new Pipe(args)
    }

    constructor(readonly data: T) {}

    to<O extends (...args: T) => any>(op: O): ReturnType<O> {
        return op.apply(null, this.data)
    }

    map<O extends (...args: T) => any>(op: O): Pipe<[ReturnType<O>]> {
        return new Pipe(this.to(op))
    }

    get 0(): T[0] { return this.data[0] }
    get 1(): T[1] { return this.data[1] }
    get 2(): T[2] { return this.data[2] }
    get 3(): T[3] { return this.data[3] }
}

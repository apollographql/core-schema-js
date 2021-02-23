export declare class Pipe<T> {
    private readonly data;
    static from<T>(data: T): Pipe<T>;
    constructor(data: T);
    into<O extends (arg: this) => any>(op: O): ReturnType<O>;
    to<O extends (arg: T) => any>(op: O): Pipe<ReturnType<O>>;
    output(): T;
}
//# sourceMappingURL=pipe.d.ts.map
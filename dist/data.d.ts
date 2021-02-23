declare const read: unique symbol;
declare const write: unique symbol;
export interface Read<V, S = any, Default = undefined> {
    [read]: ReadFn<V, S, Default>;
}
export interface Write<V, S = any> {
    [write]: WriteFn<V, S>;
}
export interface ReadFn<V, S = any, Default = undefined> {
    <D = Default>(source: S, defaultValue: D): V | D;
    (source: S): V | Default;
}
export interface WriteFn<V, S = any> {
    (source: S, value: V): void;
}
declare type Write_ValueOf<W extends Write<any>> = W extends Write<infer V> ? V : never;
declare type Read_DefaultOf<R extends Read<any, any, any>> = R extends Read<any, any, infer D> ? D : never;
declare type Read_ValueOf<R extends Read<any, any, any>> = R extends Read<infer V, any, infer D> ? V | D : never;
export declare function data<V, S = any>(description: string): Read<V, S> & Write<V, S> & ReadFn<V, S>;
export declare function derive<F extends (source: any) => any>(description: string, fn: F): F & Read<ReturnType<F>, Parameters<F>[0], ReturnType<F>>;
export declare function set<S, Col extends Write<any, S>>(source: S, col: Col, value: Write_ValueOf<Col>): void;
export declare function get<S, Col extends Read<any, S>, D = Read_DefaultOf<Col>>(source: S, col: Col, defaultValue?: D): Read_ValueOf<Col>;
export {};
//# sourceMappingURL=data.d.ts.map
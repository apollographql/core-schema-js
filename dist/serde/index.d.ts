import type { Result } from '../err';
import type { Maybe } from '../is';
export * from './nullability';
export * from './metadata';
export * from './list';
export * from './struct';
export * from './scalar';
export * from './one-of';
export declare type SerDe<T = any, N = any> = Serialize<T, N> & Deserialize<T, N>;
export interface Serialize<T = any, N = any> {
    serialize: SerFn<T, N>;
}
export interface SerFn<T, N> {
    (value: T): Maybe<N>;
}
export interface Deserialize<T = any, N = any> {
    deserialize: DeFn<T, N>;
}
export interface DeFn<T, N> {
    (node: Maybe<N>): Result<T>;
}
export declare type De_TypeOf<S extends Deserialize<any, any>> = S extends Deserialize<infer T, any> ? T : never;
export declare type Ser_TypeOf<S extends Serialize<any, any>> = S extends Serialize<infer T, any> ? T : never;
export declare type De_NodeOf<D extends Deserialize<any, any>> = D extends Deserialize<any, infer N> ? N : never;
export declare type Ser_NodeOf<S extends Serialize<any, any>> = S extends Serialize<any, infer N> ? N : never;
//# sourceMappingURL=index.d.ts.map
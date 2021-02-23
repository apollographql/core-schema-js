import { ASTNode, DocumentNode } from 'graphql';
import { AsString, Maybe } from './is';
import { Source, SourceMap } from './source';
export interface Err {
    readonly is: 'err';
    readonly code: string;
    readonly message: string;
    readonly source?: Source;
    readonly doc?: Maybe<DocumentNode>;
    readonly node?: Maybe<ASTNode>;
    readonly causes: (Err | Error)[];
    toString(mapSource?: SourceMap): string;
    toError(mapSource?: SourceMap): Error;
    unwrap(): never;
}
export default function ERR(...code: AsString): <F extends MsgFn>(fmt: F) => CreateErr<F>;
export declare type MsgFn = (props?: any) => string;
export interface CreateErr<F extends MsgFn> {
    readonly code: string;
    (input?: Fn_PropsOf<F> & Partial<Err>, ...causes: (Err | Error)[]): Err & Fn_PropsOf<F>;
}
declare type Fn_PropsOf<F extends MsgFn> = F extends (props: infer P) => any ? P : F extends () => any ? {} : never;
export interface Ok<T> {
    is: 'ok';
    ok: T;
    node: Maybe<ASTNode>;
    unwrap(): T;
}
declare class Okay<T> {
    readonly ok: T;
    readonly node: Maybe<ASTNode>;
    constructor(ok: T, node: Maybe<ASTNode>);
    get is(): 'ok';
    unwrap(): T;
}
export declare function ok<T>(ok: T, node?: Maybe<ASTNode>): Okay<T>;
export declare type Result<T> = Ok<T> | Err;
export declare type OkTypeOf<R extends Result<any>> = R extends Result<infer T> ? T : never;
export declare function isErr(o: any): o is Err;
export declare function isOk<T>(o: any): o is Ok<T>;
export declare function asResultFn<F extends (...args: any) => any>(fn: F): (...args: Parameters<F>) => Result<ReturnType<F>>;
export declare function siftValues<T>(results: Result<T>[]): [Err[], T[]];
export declare function siftResults<T>(results: Result<T>[]): [Err[], Ok<T>[]];
export {};
//# sourceMappingURL=err.d.ts.map
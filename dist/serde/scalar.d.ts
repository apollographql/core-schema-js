import type { Serialize, Deserialize } from '.';
import type { EnumValueNode, FloatValueNode, IntValueNode, NullValueNode, BooleanValueNode, StringValueNode, ValueNode } from 'graphql';
import { Maybe } from '../is';
import { Result } from '../err';
export declare const ErrReadNaN: import("../err").CreateErr<(props: {
    repr: string;
}) => string>;
export declare const ErrReadIntRange: import("../err").CreateErr<(props: {
    repr: string;
}) => string>;
export declare type ScalarKind = (EnumValueNode | FloatValueNode | IntValueNode | NullValueNode | BooleanValueNode | StringValueNode)["kind"];
export declare function scalar<T, K extends ScalarKind>(kind: K, decode: (repr: string) => Result<T>, encode?: (value: T) => string): Serialize<Maybe<T>, ValueNode | NullValueNode> & Deserialize<Maybe<T>, ValueNode | NullValueNode>;
export declare const Int: Serialize<Maybe<number>, ValueNode> & Deserialize<Maybe<number>, ValueNode>;
export declare const Bool: Serialize<import("graphql/jsutils/Maybe").Maybe<boolean>, ValueNode> & Deserialize<import("graphql/jsutils/Maybe").Maybe<boolean>, ValueNode>;
export declare const Float: Serialize<Maybe<number>, ValueNode> & Deserialize<Maybe<number>, ValueNode>;
export declare const Str: Serialize<import("graphql/jsutils/Maybe").Maybe<string>, ValueNode> & Deserialize<import("graphql/jsutils/Maybe").Maybe<string>, ValueNode>;
export interface Coder<T> {
    decode(repr: string): Result<T>;
    encode?(value: T): string;
}
export declare type CoderTypeOf<C extends Coder<any>> = C extends Coder<infer T> ? T : never;
export declare type CustomScalarOf<C extends Coder<any>> = C extends Coder<infer T> ? Serialize<Maybe<T>, ValueNode> & Deserialize<Maybe<T>, ValueNode> : never;
export declare function customScalar<T>(coder: Coder<T>): CustomScalarOf<Coder<T>>;
export declare const hasValue: (o: any) => o is {
    value: string;
};
//# sourceMappingURL=scalar.d.ts.map
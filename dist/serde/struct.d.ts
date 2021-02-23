import { ObjectValueNode, NullValueNode, DirectiveNode } from 'graphql';
import { Maybe } from 'graphql/jsutils/Maybe';
import { De_TypeOf, SerDe, Serialize, Deserialize } from '.';
import { HasMetadata } from './metadata';
export declare const ErrReadField: import("../err").CreateErr<(props: {
    name: string;
}) => string>;
export declare const ErrReadStruct: import("../err").CreateErr<() => string>;
export default struct;
export interface Shape {
    [key: string]: SerDe;
}
export declare type Shape_DeTypeOf<S extends Shape> = {
    [K in keyof S]: De_TypeOf<S[K]>;
};
export declare type Struct<S extends Shape> = Serialize<Maybe<Shape_DeTypeOf<S>>, ObjectValueNode | NullValueNode> & Deserialize<Maybe<Shape_DeTypeOf<S>>, HasMetadata | NullValueNode>;
export declare function struct<S extends Shape>(shape: S): Struct<S>;
export declare function dir<S extends Shape>(name: string, shape: S): Dir<S>;
export declare type Dir<S extends Shape> = Serialize<Shape_DeTypeOf<S>, DirectiveNode> & Deserialize<Maybe<Shape_DeTypeOf<S>>, DirectiveNode> & {
    readonly shape: S;
    readonly name: string;
};
//# sourceMappingURL=struct.d.ts.map
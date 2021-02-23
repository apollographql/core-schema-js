import { NullValueNode, ASTNode } from 'graphql';
import { Maybe, Must } from '../is';
import { Serialize, Deserialize, De_TypeOf, Ser_NodeOf, De_NodeOf } from '.';
export declare const ErrNullNode: import("../err").CreateErr<(props: {
    node: Maybe<ASTNode>;
}) => string>;
export declare const ErrNullValue: import("../err").CreateErr<(props: {
    value: any;
}) => string>;
export declare function maybe<S extends Serialize & Deserialize>({ serialize, deserialize }: S): Serialize<Maybe<De_TypeOf<S>>, Ser_NodeOf<S> | NullValueNode> & Deserialize<Maybe<De_TypeOf<S>>, De_NodeOf<S> | NullValueNode>;
export declare function must<S extends Serialize & Deserialize>(type: S): Serialize<Must<De_TypeOf<S>>, Exclude<Ser_NodeOf<S>, NullValueNode>> & Deserialize<Must<De_TypeOf<S>>, Exclude<De_NodeOf<S>, NullValueNode>>;
//# sourceMappingURL=nullability.d.ts.map
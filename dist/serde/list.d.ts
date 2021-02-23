import { ListValueNode, NullValueNode } from 'graphql';
import { Maybe } from '../is';
import type { SerDe, Serialize, Deserialize, De_TypeOf } from '.';
export declare const ErrReadList: import("../err").CreateErr<() => string>;
export declare function list<T extends SerDe>(type: T): Serialize<Maybe<De_TypeOf<T>[]>, ListValueNode | NullValueNode> & Deserialize<Maybe<De_TypeOf<T>[]>, ListValueNode | NullValueNode>;
//# sourceMappingURL=list.d.ts.map
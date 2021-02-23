import type { ASTNode } from 'graphql';
import type { Maybe } from '../is';
export declare const ErrWrongNodeKind: import("../err").CreateErr<(props: {
    expected: string[];
    node: Maybe<ASTNode>;
}) => string>;
export declare const NullValue: Readonly<{
    kind: "NullValue";
}>;
//# sourceMappingURL=nodes.d.ts.map
import { ValueNode, DirectiveNode, ObjectValueNode } from 'graphql';
export declare type HasMetadata = DirectiveNode | ObjectValueNode;
export declare const metadata: ((target: HasMetadata) => Map<string, ValueNode>) & import("../data").Read<Map<string, ValueNode>, HasMetadata, Map<string, ValueNode>>;
export declare const hasMetadata: (o: any) => o is HasMetadata;
export default metadata;
//# sourceMappingURL=metadata.d.ts.map
import type { ASTNode, DocumentNode } from 'graphql';
import type { Source } from './source';
export declare const sourceOf: import("./data").Read<Source, any, undefined> & import("./data").Write<Source, any> & import("./data").ReadFn<Source, any, undefined>;
export declare const documentOf: import("./data").Read<DocumentNode, ASTNode, undefined> & import("./data").Write<DocumentNode, ASTNode> & import("./data").ReadFn<DocumentNode, ASTNode, undefined>;
export declare function ensureDocumentOf(node: ASTNode): DocumentNode;
export declare const pathOf: import("./data").Read<readonly (string | number)[], ASTNode, undefined> & import("./data").Write<readonly (string | number)[], ASTNode> & import("./data").ReadFn<readonly (string | number)[], ASTNode, undefined>;
//# sourceMappingURL=linkage.d.ts.map
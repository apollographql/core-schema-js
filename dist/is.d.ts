export declare type Template = Parameters<typeof String.raw>;
export declare const isTemplate: (args: any[]) => args is [template: TemplateStringsArray, ...substitutions: any[]];
export declare const isAsString: (args: any[]) => args is AsTemplateOr<string>;
export declare type AsTemplateOr<T> = Template | [T];
export declare type AsString = AsTemplateOr<string>;
export declare function asString<I extends any[]>(input: I): (I extends AsString ? string : undefined);
export declare function isNonEmpty<T>(input: T[]): input is [T, ...T[]];
export declare function isEmpty<T>(input: T[]): input is [];
import type { ASTKindToNode, ASTNode } from 'graphql';
export declare function isAst<K extends ASTNode["kind"]>(obj: any, ...kinds: K[]): obj is ASTKindToNode[K];
export declare type Maybe<T> = T | null | undefined;
export declare type Must<T> = Exclude<T, null | undefined>;
//# sourceMappingURL=is.d.ts.map
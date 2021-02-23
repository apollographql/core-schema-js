import type { Location, ASTNode } from 'graphql';
import { AsString } from './is';
export interface Source {
    src: string;
    text: string;
}
export declare type AsSource = AsString | [Source];
export declare function source(...source: AsSource): Source;
export interface SourceMap {
    (from?: Location | ASTNode): string;
}
export default function sourceMap(...input: AsSource | [undefined] | []): SourceMap;
//# sourceMappingURL=source.d.ts.map
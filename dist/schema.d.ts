import type { DocumentNode, SchemaDefinitionNode } from 'graphql';
import type { AsSource, Source } from './source';
import { Err } from './err';
import { Read } from './data';
import { Spec } from './spec';
import { Maybe } from './is';
import { Pipe } from './pipe';
export declare const ErrNoSchemas: import("./err").CreateErr<() => string>;
export declare const ErrExtraSchema: import("./err").CreateErr<() => string>;
export declare const ErrNoCore: import("./err").CreateErr<() => string>;
export declare const ErrCoreSpecIdentity: import("./err").CreateErr<(props: {
    got: string;
}) => string>;
export declare const ErrDocumentNotOk: import("./err").CreateErr<() => string>;
export default fromSource;
export declare function fromSource(...asSource: AsSource): Pipe<DocumentNode>;
export declare const document: ((src: Source) => DocumentNode) & Read<DocumentNode, Source, DocumentNode>;
export declare function report(...errs: Err[]): void;
export declare const errors: ((_: DocumentNode) => Err[]) & Read<Err[], DocumentNode, Err[]>;
export declare const attach: (...layers: Read<any, DocumentNode, any>[]) => (doc: DocumentNode) => DocumentNode;
export declare function ensure(doc: DocumentNode): DocumentNode;
export declare const schemaDef: ((doc: DocumentNode) => SchemaDefinitionNode | undefined) & Read<SchemaDefinitionNode | undefined, DocumentNode, SchemaDefinitionNode | undefined>;
declare type Req = {
    using: Spec;
    as: Maybe<string>;
    export: Maybe<boolean>;
};
export declare const using: ((doc: DocumentNode) => Req[]) & Read<Req[], DocumentNode, Req[]>;
//# sourceMappingURL=schema.d.ts.map
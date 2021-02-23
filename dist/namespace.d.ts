import { DocumentNode } from 'graphql';
import { Maybe } from './is';
import { Spec } from './spec';
declare class Namespace {
    readonly name: string;
    readonly spec: Spec;
    readonly isExport: boolean;
    constructor(name: string, spec: Spec, isExport: boolean);
    specifiedName(nameInDoc: string): string | null;
}
export declare const namespacesIn: ((doc: DocumentNode) => Map<string, Namespace>) & import("./data").Read<Map<string, Namespace>, DocumentNode, Map<string, Namespace>>;
export declare const namespaceOf: ((node: any) => Maybe<Namespace>) & import("./data").Read<Maybe<Namespace>, any, Maybe<Namespace>>;
export declare function namespaceFor(doc: DocumentNode, spec: Spec): Maybe<Namespace>;
export declare const isExport: ((node: any) => boolean) & import("./data").Read<boolean, any, boolean>;
export declare function exportSchema(doc: DocumentNode): any;
export {};
//# sourceMappingURL=namespace.d.ts.map
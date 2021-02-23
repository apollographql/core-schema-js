import { AnyDirective, Directive_DataOf, Directive_NodeOf } from './bind';
export declare const ErrRepeated: import("./err").CreateErr<(props: {
    fqname: string;
}) => string>;
export declare const ErrRepetition: import("./err").CreateErr<(props: {
    fqname: string;
}) => string>;
export declare const scan: <D extends AnyDirective>(node: Directive_NodeOf<D>, directive: D) => Directive_DataOf<D>[];
//# sourceMappingURL=scan.d.ts.map
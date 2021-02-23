import { Result } from './err';
import { AsString } from './is';
export declare type AsVersion = AsString | [number, number];
declare const _default: (...input: AsVersion) => Version;
export default _default;
export declare const ErrVersionParse: import("./err").CreateErr<(props: {
    got: string;
}) => string>;
export declare class Version {
    readonly major: number;
    readonly minor: number;
    constructor(major: number, minor: number);
    static parse(input: string): Version;
    static decode(input: string): Result<Version>;
    static from(...input: AsVersion): Version;
    satisfies(required: Version): boolean;
    toString(): string;
    private static VERSION_RE;
}
//# sourceMappingURL=version.d.ts.map
import { URL } from 'url';
import { Result } from './err';
import { AsString } from './is';
import { Version } from './version';
export declare const ErrNoPath: import("./err").CreateErr<({ url }: {
    url: URL;
}) => string>;
export declare const ErrNoName: import("./err").CreateErr<({ url }: {
    url: URL;
}) => string>;
export declare const ErrNoVersion: import("./err").CreateErr<({ url }: {
    url: URL;
}) => string>;
export declare class Spec {
    readonly identity: string;
    readonly name: string;
    readonly version: Version;
    constructor(identity: string, name: string, version: Version);
    static parse(input: string): Spec;
    static decode(input: string): Result<Spec>;
    satisfies(requested: Spec): boolean;
    get url(): string;
    toString(): string;
}
export declare const spec: (...input: AsString) => Spec;
//# sourceMappingURL=spec.d.ts.map
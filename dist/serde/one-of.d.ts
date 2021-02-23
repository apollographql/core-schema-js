import { Deserialize, De_NodeOf, De_TypeOf } from '.';
import { Shape } from './struct';
export default oneOf;
export declare const ErrReadForm: import("../err").CreateErr<(props: {
    name: string;
}) => string>;
export declare const ErrNoMatch: import("../err").CreateErr<() => string>;
export declare type OneOf<S extends Shape> = Deserialize<Variant<S>, De_NodeOf<S[keyof S]>>;
export declare type Variant<S extends Shape> = {
    [k in keyof S]: {
        is: k;
    } & PickOne<S, k>;
}[keyof S];
export declare type PickOne<S extends Shape, pick extends keyof S> = {
    [k in keyof S]: k extends pick ? De_TypeOf<S[k]> : never;
};
export declare function oneOf<S extends Shape>(forms: S): OneOf<S>;
//# sourceMappingURL=one-of.d.ts.map
import type { Specified } from '.';
import { Coder, CustomScalarOf } from '../serde';
export default scalar;
export declare function scalar<S extends string, N extends string, C extends Coder<any> = Coder<string>>(spec: S, name: N, coder?: C): CustomScalarOf<C> & Specified<S, N>;
//# sourceMappingURL=scalar.d.ts.map
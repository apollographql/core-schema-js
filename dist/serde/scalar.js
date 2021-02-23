"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasValue = exports.customScalar = exports.Str = exports.Float = exports.Bool = exports.Int = exports.scalar = exports.ErrReadIntRange = exports.ErrReadNaN = void 0;
const is_1 = require("../is");
const err_1 = __importStar(require("../err"));
const nodes_1 = require("./nodes");
exports.ErrReadNaN = err_1.default `ReadNaN`((props) => `"${props.repr}" decoded to NaN`);
exports.ErrReadIntRange = err_1.default `ReadIntRange`((props) => `"${props.repr}" out of range for integers`);
function scalar(kind, decode, encode = v => String(v)) {
    return {
        serialize(value) {
            if (!value)
                return nodes_1.NullValue;
            return {
                kind,
                value: encode(value)
            };
        },
        deserialize(node) {
            if (!node || is_1.isAst(node, 'NullValue'))
                return err_1.ok(null, node);
            if (is_1.isAst(node, kind) && exports.hasValue(node))
                return decode(node.value);
            return nodes_1.ErrWrongNodeKind({ expected: [kind], node });
        }
    };
}
exports.scalar = scalar;
exports.Int = scalar('IntValue', repr => {
    const decoded = +repr;
    if (Number.isNaN(decoded))
        return exports.ErrReadNaN({ repr });
    if (!Number.isSafeInteger(decoded))
        exports.ErrReadIntRange({ repr });
    return err_1.ok(decoded);
});
exports.Bool = scalar('BooleanValue', repr => err_1.ok(!!repr));
exports.Float = scalar('FloatValue', repr => {
    const decoded = +repr;
    if (Number.isNaN(decoded))
        return exports.ErrReadNaN({ repr });
    return err_1.ok(decoded);
});
exports.Str = scalar('StringValue', repr => err_1.ok(repr));
function customScalar(coder) {
    const encode = coder.encode
        ? (value) => coder.encode(value)
        : (value) => String(value);
    const decode = (repr) => coder.decode(repr);
    return scalar('StringValue', decode, encode);
}
exports.customScalar = customScalar;
const hasValue = (o) => typeof (o === null || o === void 0 ? void 0 : o.value) !== 'undefined';
exports.hasValue = hasValue;
//# sourceMappingURL=scalar.js.map
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
exports.must = exports.maybe = exports.ErrNullValue = exports.ErrNullNode = void 0;
const is_1 = require("../is");
const err_1 = __importStar(require("../err"));
const nodes_1 = require("./nodes");
exports.ErrNullNode = err_1.default `NullNode`((props) => { var _a; return `expected non-null node, got ${(_a = props.node) === null || _a === void 0 ? void 0 : _a.kind}`; });
exports.ErrNullValue = err_1.default `NullValue`((props) => `expected non-null value, got ${props.value}`);
function maybe({ serialize, deserialize }) {
    return {
        serialize(val) {
            if (val == null)
                return nodes_1.NullValue;
            return serialize(val);
        },
        deserialize(node) {
            if (!node || is_1.isAst(node, 'NullValue'))
                return err_1.ok(null, node);
            return deserialize(node);
        },
    };
}
exports.maybe = maybe;
function must(type) {
    return Object.create(type, {
        deserialize: {
            value(node) {
                if (!node || is_1.isAst(node, 'NullValue'))
                    return exports.ErrNullNode({ node });
                const result = type.deserialize(node);
                if (!err_1.isErr(result) && result.ok == null)
                    return exports.ErrNullValue({ node, value: result.ok });
                return result;
            }
        }
    });
}
exports.must = must;
//# sourceMappingURL=nullability.js.map
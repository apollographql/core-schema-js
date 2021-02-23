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
exports.list = exports.ErrReadList = void 0;
const is_1 = require("../is");
const err_1 = __importStar(require("../err"));
const nodes_1 = require("./nodes");
exports.ErrReadList = err_1.default `ReadList`(() => `error deserializing list`);
function list(type) {
    return {
        serialize: (values) => values ? {
            kind: 'ListValue',
            values: values.map(v => type.serialize(v)).filter(Boolean)
        } : nodes_1.NullValue,
        deserialize: (node) => {
            if (!node || is_1.isAst(node, 'NullValue'))
                return err_1.ok(null, node);
            const results = node.values
                .map(v => type.deserialize(v));
            const [errors, values] = err_1.siftValues(results);
            if (errors.length)
                return exports.ErrReadList({ node: node }, ...errors);
            return err_1.ok(values, node);
        }
    };
}
exports.list = list;
//# sourceMappingURL=list.js.map
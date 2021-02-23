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
exports.dir = exports.struct = exports.ErrReadStruct = exports.ErrReadField = void 0;
const err_1 = __importStar(require("../err"));
const nullability_1 = require("./nullability");
const metadata_1 = require("./metadata");
const nodes_1 = require("./nodes");
exports.ErrReadField = err_1.default `ReadField`((props) => `could not read field "${props.name}"`);
exports.ErrReadStruct = err_1.default `ReadStruct`(() => `could not read struct`);
exports.default = struct;
function struct(shape) {
    return {
        serialize: (value) => {
            if (!value)
                return nodes_1.NullValue;
            return {
                kind: 'ObjectValue',
                fields: serializeFields(shape, value, 'ObjectField')
            };
        },
        deserialize: (node) => {
            if (!metadata_1.hasMetadata(node))
                return nodes_1.ErrWrongNodeKind({ node, expected: ['ObjectValueNode', 'DirectiveNode'] });
            const md = metadata_1.metadata(node);
            const results = Object.entries(shape)
                .map(([name, type]) => ({
                name,
                field: md.get(name),
                result: type.deserialize(md.get(name))
            }));
            const errors = [];
            const entries = [];
            for (const { name, field, result } of results) {
                if (err_1.isErr(result))
                    errors.push(exports.ErrReadField({
                        name,
                        node: field
                    }, result));
                if (err_1.isOk(result))
                    entries.push([name, result.ok]);
            }
            if (errors.length)
                return exports.ErrReadStruct({ node }, ...errors);
            return err_1.ok(Object.fromEntries(entries), node);
        }
    };
}
exports.struct = struct;
function dir(name, shape) {
    const structure = nullability_1.must(struct(shape));
    const nameNode = { kind: 'Name', value: name };
    return {
        shape,
        name,
        serialize(value) {
            return {
                kind: 'Directive',
                name: nameNode,
                arguments: serializeFields(shape, value, 'Argument')
            };
        },
        deserialize(node) {
            if ((node === null || node === void 0 ? void 0 : node.kind) !== 'Directive')
                return nodes_1.ErrWrongNodeKind({ expected: ['Directive'], node });
            if (node.name.value !== name)
                return err_1.ok(null, node);
            return structure.deserialize(node);
        }
    };
}
exports.dir = dir;
function serializeFields(shape, value, kind) {
    return Object.entries(shape)
        .map(([name, type]) => ({
        kind,
        name: { kind: 'Name', value: name },
        value: type.serialize(value[name])
    }));
}
//# sourceMappingURL=struct.js.map
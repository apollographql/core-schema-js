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
exports.scan = exports.ErrRepetition = exports.ErrRepeated = void 0;
const data_1 = require("./data");
const namespace_1 = require("./namespace");
const serde_1 = require("./serde");
const spec_1 = require("./spec");
const err_1 = __importStar(require("./err"));
const linkage_1 = require("./linkage");
const schema_1 = require("./schema");
exports.ErrRepeated = err_1.default `ErrRepeated`((props) => `non-repeatable directive "${props.fqname}" was found multiple times`);
exports.ErrRepetition = err_1.default `ErrRepetition`((props) => `"${props.fqname}" found here`);
const scan = (node, directive) => scannerFor(directive)(node);
exports.scan = scan;
const scannerFor = data_1.derive('scanner', (directive) => {
    const { spec, name, args, repeatable, locations } = directive;
    const self = spec_1.Spec.parse(spec);
    const fqname = `${spec}#${name}`;
    const kinds = new Set(locations.map(locToKind));
    const forDoc = data_1.derive(`impl ${fqname}`, (doc) => {
        var _a;
        const specifiedName = (_a = namespace_1.namespaceFor(doc, self)) === null || _a === void 0 ? void 0 : _a.specifiedName(name);
        if (!specifiedName)
            return null;
        return serde_1.dir(specifiedName, args);
    });
    return data_1.derive(`results ${fqname}`, (node) => {
        if (!kinds.has(node.kind))
            return [];
        const de = forDoc(linkage_1.ensureDocumentOf(node));
        if (!de)
            return [];
        const results = directivesOn(node).map(de.deserialize)
            .filter(r => r.is === 'err' || r.ok);
        if (!repeatable && results.length > 1) {
            schema_1.report(exports.ErrRepeated({ fqname, node }), ...results.map(r => exports.ErrRepetition({ fqname, node: r.node })));
            return [];
        }
        const [errors, values] = err_1.siftValues(results);
        schema_1.report(...errors);
        return values.map(data => ({
            spec: spec,
            name: name,
            data,
            node,
        }));
    });
});
function locToKind(on) {
    return locationToKind[on];
}
const locationToKind = {
    SCHEMA: 'SchemaDefinition',
    SCALAR: 'ScalarTypeDefinition',
    OBJECT: 'ObjectTypeDefinition',
    FIELD_DEFINITION: 'FieldDefinition',
    ARGUMENT_DEFINITION: 'InputValueDefinition',
    INTERFACE: 'InterfaceTypeDefinition',
    UNION: 'UnionTypeDefinition',
    ENUM: 'EnumTypeDefinition',
    ENUM_VALUE: 'EnumValue',
    INPUT_OBJECT: 'InputObjectTypeDefinition',
    INPUT_FIELD_DEFINITION: 'InputValueDefinition',
};
function directivesOn(node) {
    var _a;
    return (_a = node.directives) !== null && _a !== void 0 ? _a : [];
}
//# sourceMappingURL=scan.js.map
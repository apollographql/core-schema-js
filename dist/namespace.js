"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportSchema = exports.isExport = exports.namespaceFor = exports.namespaceOf = exports.namespacesIn = void 0;
const graphql_1 = require("graphql");
const data_1 = require("./data");
const is_1 = require("./is");
const linkage_1 = require("./linkage");
const schema_1 = require("./schema");
const core_1 = require("./specs/core");
const scan_1 = require("./scan");
class Namespace {
    constructor(name, spec, isExport) {
        this.name = name;
        this.spec = spec;
        this.isExport = isExport;
    }
    specifiedName(nameInDoc) {
        const [prefix, base] = getPrefix(nameInDoc);
        if (prefix) {
            if (prefix !== this.name)
                return null;
            return `${this.spec.name}__${base}`;
        }
        if (base !== this.name)
            return null;
        return this.spec.name;
    }
}
exports.namespacesIn = data_1.derive('Namespaces in document', (doc) => {
    var _a;
    const names = new Map();
    for (const layer of schema_1.using(doc)) {
        const name = (_a = layer.as) !== null && _a !== void 0 ? _a : layer.using.name;
        names.set(name, new Namespace(name, layer.using, !!layer.export));
    }
    return names;
});
exports.namespaceOf = data_1.derive('Namespace of this node', node => {
    if (!hasName(node))
        return null;
    const [prefix] = getPrefix(node.name.value);
    if (prefix || is_1.isAst(node, 'Directive', 'DirectiveDefinition')) {
        return exports.namespacesIn(linkage_1.ensureDocumentOf(node))
            .get(prefix !== null && prefix !== void 0 ? prefix : node.name.value);
    }
    return null;
});
function namespaceFor(doc, spec) {
    for (const ns of exports.namespacesIn(doc).values()) {
        if (ns.spec && spec.satisfies(ns.spec))
            return ns;
    }
    return null;
}
exports.namespaceFor = namespaceFor;
exports.isExport = data_1.derive('Is this node in the export schema?', node => {
    const [explicit] = scan_1.scan(node, core_1.surface);
    if (explicit)
        return explicit.data.export;
    const ns = exports.namespaceOf(node);
    if (!ns || ns.isExport)
        return true;
    return false;
});
function exportSchema(doc) {
    return graphql_1.visit(doc, {
        enter(node) {
            if (!exports.isExport(node))
                return null;
            return undefined;
        }
    });
}
exports.exportSchema = exportSchema;
function getPrefix(name, sep = '__') {
    const idx = name.indexOf(sep);
    if (idx === -1)
        return [null, name];
    return [name.substr(0, idx), name.substr(idx + sep.length)];
}
const hasName = (node) => is_1.isAst(node === null || node === void 0 ? void 0 : node.name, 'Name');
//# sourceMappingURL=namespace.js.map
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
exports.using = exports.schemaDef = exports.ensure = exports.attach = exports.errors = exports.report = exports.document = exports.fromSource = exports.ErrDocumentNotOk = exports.ErrCoreSpecIdentity = exports.ErrNoCore = exports.ErrExtraSchema = exports.ErrNoSchemas = void 0;
const err_1 = __importStar(require("./err"));
const graphql_1 = require("graphql");
const source_1 = require("./source");
const data_1 = require("./data");
const linkage_1 = require("./linkage");
const spec_1 = require("./spec");
const is_1 = require("./is");
const pipe_1 = require("./pipe");
const serde_1 = require("./serde");
exports.ErrNoSchemas = err_1.default `NoSchemas`(() => `no schema definition found`);
exports.ErrExtraSchema = err_1.default `ExtraSchema`(() => `extra schema definition ignored`);
exports.ErrNoCore = err_1.default `NoCore`(() => `@core(using: "${core}") directive required on schema definition`);
exports.ErrCoreSpecIdentity = err_1.default `NoCoreSpecIdentity`((props) => `the first @core directive must reference "${core.identity}", got: "${props.got}"`);
exports.ErrDocumentNotOk = err_1.default `DocumentNotOk`(() => `one or more errors on document`);
exports.default = fromSource;
function fromSource(...asSource) {
    return pipe_1.Pipe.from(source_1.source(...asSource))
        .to(exports.document)
        .to(exports.attach(exports.using));
}
exports.fromSource = fromSource;
exports.document = data_1.derive('Document for source', (src) => link(graphql_1.parse(src.text), src));
function report(...errs) {
    for (const err of errs)
        if (err.doc)
            exports.errors(err.doc).push(err);
}
exports.report = report;
exports.errors = data_1.derive('Document errors', (_) => []);
const attach = (...layers) => (doc) => {
    layers.forEach(l => data_1.get(doc, l));
    return doc;
};
exports.attach = attach;
function ensure(doc) {
    const errs = exports.errors(doc);
    if (errs.length) {
        throw exports.ErrDocumentNotOk({
            node: doc,
        }, ...errs).toError();
    }
    return doc;
}
exports.ensure = ensure;
function link(doc, source) {
    graphql_1.visit(doc, {
        enter(node, _key, _parent, path) {
            data_1.set(node, linkage_1.documentOf, doc);
            data_1.set(node, linkage_1.sourceOf, source);
            data_1.set(node, linkage_1.pathOf, [...path]);
        }
    });
    return doc;
}
exports.schemaDef = data_1.derive('The schema definition node', (doc) => {
    let schema = void 0;
    for (const def of doc.definitions) {
        if (is_1.isAst(def, 'SchemaDefinition')) {
            if (!schema) {
                schema = def;
                continue;
            }
            const error = exports.ErrExtraSchema({ doc, node: def });
            report(error);
        }
    }
    if (!schema) {
        const error = exports.ErrNoSchemas({ doc });
        report(error);
    }
    return schema;
});
const core = spec_1.spec `https://lib.apollo.dev/core/v0.1`;
exports.using = data_1.derive('Specs in use by this schema', (doc) => {
    var _a, _b;
    const schema = exports.schemaDef(doc);
    if (!schema)
        return [];
    const bootstrapReq = serde_1.must(serde_1.struct({
        using: serde_1.must(serde_1.customScalar(spec_1.Spec)),
        as: serde_1.Str,
        export: serde_1.Bool,
    }));
    const [errs, okays] = err_1.siftResults(((_a = schema.directives) !== null && _a !== void 0 ? _a : [])
        .filter(d => serde_1.metadata(d).has('using'))
        .map(bootstrapReq.deserialize));
    const coreReq = okays.find(r => {
        var _a;
        return is_1.isAst(r.node, 'Directive') &&
            r.node.name.value === ((_a = r.ok.as) !== null && _a !== void 0 ? _a : core.name);
    });
    const coreName = ((_b = coreReq === null || coreReq === void 0 ? void 0 : coreReq.ok.as) !== null && _b !== void 0 ? _b : core.name);
    if (!coreReq) {
        report(exports.ErrNoCore({ doc, node: schema }));
        return [];
    }
    const { ok: coreUse, node: directive } = coreReq;
    if (coreUse.using.identity !== core.identity) {
        report(exports.ErrCoreSpecIdentity({
            doc,
            node: directive !== null && directive !== void 0 ? directive : schema,
            got: coreUse.using.identity
        }));
        return [];
    }
    report(...errs.filter(e => is_1.isAst(e.node, 'Directive') &&
        e.node.name.value === coreName));
    return okays.map(r => r.ok);
});
//# sourceMappingURL=schema.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.siftResults = exports.siftValues = exports.asResultFn = exports.isOk = exports.isErr = exports.ok = void 0;
const is_1 = require("./is");
const source_1 = __importDefault(require("./source"));
const linkage_1 = require("./linkage");
function ERR(...code) {
    const codeStr = is_1.asString(code);
    return createWithFormatter;
    function createWithFormatter(fmt) {
        const proto = Object.create(BASE, {
            code: {
                get() { return codeStr; }
            },
            message: {
                get() {
                    return fmt.apply(this, [this]);
                }
            }
        });
        return Object.assign((props, ...causes) => Object.create(proto, {
            ...sourceDocDescriptors(props.node),
            ...Object.fromEntries(Object.entries(props)
                .map(([prop, value]) => [prop, { value }])),
            causes: { value: causes },
        }), { code: codeStr });
    }
}
exports.default = ERR;
const BASE = Object.freeze({
    is: 'err',
    toString,
    causes: Object.freeze([]),
    toError,
    unwrap() {
        throw this.toError();
    }
});
class Okay {
    constructor(ok, node) {
        this.ok = ok;
        this.node = node;
    }
    get is() { return 'ok'; }
    unwrap() { return this.ok; }
}
function ok(ok, node) {
    return new Okay(ok, node);
}
exports.ok = ok;
function isErr(o) {
    return (o === null || o === void 0 ? void 0 : o.is) === 'err';
}
exports.isErr = isErr;
function isOk(o) {
    return (o === null || o === void 0 ? void 0 : o.is) === 'ok';
}
exports.isOk = isOk;
function asResultFn(fn) {
    return apply;
    function apply(...args) {
        try {
            return ok(fn.apply(null, args));
        }
        catch (error) {
            const err = Object.create(FROM_ERROR);
            err.causes = [error];
            return err;
        }
    }
}
exports.asResultFn = asResultFn;
function siftValues(results) {
    const okays = [], errors = [];
    for (const r of results) {
        if (isOk(r))
            okays.push(r.ok);
        else
            errors.push(r);
    }
    return [errors, okays];
}
exports.siftValues = siftValues;
function siftResults(results) {
    const okays = [], errors = [];
    for (const r of results) {
        if (isOk(r))
            okays.push(r);
        else
            errors.push(r);
    }
    return [errors, okays];
}
exports.siftResults = siftResults;
const FROM_ERROR = Object.create(BASE, {
    message: {
        get() {
            var _a;
            return (_a = this.causes[0]) === null || _a === void 0 ? void 0 : _a.message;
        }
    },
    code: {
        get() {
            var _a, _b;
            return (_b = (_a = this.causes[0]) === null || _a === void 0 ? void 0 : _a.code) !== null && _b !== void 0 ? _b : 'UnknownError';
        }
    },
});
function toString(mapSource = source_1.default(this.source)) {
    var _a, _b;
    let str = `[${(_a = this.code) !== null && _a !== void 0 ? _a : 'UNKNOWN'}] ${mapSource((_b = this.node) === null || _b === void 0 ? void 0 : _b.loc)}: ${this.message}`;
    for (const cause of this.causes) {
        str += '\n  - ' + cause.toString(mapSource).split('\n').join('\n    ');
    }
    return str;
}
function toError(mapSource = source_1.default(this.source)) {
    const error = new Error(this.toString(mapSource));
    Object.assign(error, this);
    return error;
}
function sourceDocDescriptors(node) {
    if (!node)
        return {};
    const descriptors = {};
    const source = linkage_1.sourceOf(node);
    if (source)
        descriptors.source = { value: source };
    const doc = linkage_1.documentOf(node);
    if (doc)
        descriptors.doc = { value: doc };
    return descriptors;
}
//# sourceMappingURL=err.js.map
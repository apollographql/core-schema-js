"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasMetadata = exports.metadata = void 0;
const is_1 = require("../is");
const data_1 = require("../data");
exports.metadata = data_1.derive('Key value mapping over arguments / fields', (target) => {
    const args = is_1.isAst(target, 'Directive') ? target.arguments : target.fields;
    const meta = new Map();
    for (const arg of args !== null && args !== void 0 ? args : []) {
        meta.set(arg.name.value, arg.value);
    }
    return meta;
});
const hasMetadata = (o) => is_1.isAst(o, 'Directive', 'ObjectValue');
exports.hasMetadata = hasMetadata;
exports.default = exports.metadata;
//# sourceMappingURL=metadata.js.map
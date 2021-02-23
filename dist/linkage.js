"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pathOf = exports.ensureDocumentOf = exports.documentOf = exports.sourceOf = void 0;
const data_1 = require("./data");
exports.sourceOf = data_1.data('Source location');
exports.documentOf = data_1.data('Document for node');
function ensureDocumentOf(node) {
    const doc = exports.documentOf(node);
    if (!doc)
        throw new NodeNotAttachedError(node);
    return doc;
}
exports.ensureDocumentOf = ensureDocumentOf;
exports.pathOf = data_1.data('Path to node');
class NodeNotAttachedError extends Error {
    constructor(node) {
        super('node is not attached and must be for this operation');
        this.node = node;
    }
}
//# sourceMappingURL=linkage.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scalar = void 0;
const serde_1 = require("../serde");
const err_1 = require("../err");
exports.default = scalar;
function scalar(spec, name, coder) {
    return Object.assign(serde_1.customScalar(coder ? coder
        : { decode(repr) { return err_1.ok(repr); } }), { spec, name });
}
exports.scalar = scalar;
//# sourceMappingURL=scalar.js.map
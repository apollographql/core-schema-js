"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.print = exports.test = void 0;
const linkage_1 = require("../linkage");
const test = (val) => !!linkage_1.pathOf(val);
exports.test = test;
const print = (val) => { var _a; return `${val.kind} <${(_a = linkage_1.pathOf(val)) === null || _a === void 0 ? void 0 : _a.join("/")}>`; };
exports.print = print;
//# sourceMappingURL=ast.js.map
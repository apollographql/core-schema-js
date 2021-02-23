"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullValue = exports.ErrWrongNodeKind = void 0;
const err_1 = __importDefault(require("../err"));
exports.ErrWrongNodeKind = err_1.default `WrongNodeKind`((props) => { var _a; return `expected node of type ${props.expected.join(' | ')}, got ${(_a = props.node) === null || _a === void 0 ? void 0 : _a.kind}`; });
exports.NullValue = Object.freeze({ kind: 'NullValue' });
//# sourceMappingURL=nodes.js.map
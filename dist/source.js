"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.source = void 0;
const binarysearch_1 = __importDefault(require("binarysearch"));
const is_1 = require("./is");
function source(...source) {
    if (is_1.isAsString(source))
        return {
            src: '<anonymous>',
            text: is_1.asString(source)
        };
    return source[0];
}
exports.source = source;
const isNode = (o) => typeof (o === null || o === void 0 ? void 0 : o.kind) === 'string';
const locationFrom = (from) => isNode(from) ? from.loc : from;
function sourceMap(...input) {
    if (is_1.isEmpty(input) || !input[0])
        return nullMap;
    const { src, text } = source(...input);
    const endings = [...indexesOf(text)];
    return describe;
    function describe(from) {
        const loc = locationFrom(from);
        if (!loc)
            return `${src}:[unknown]`;
        const line = binarysearch_1.default.closest(endings, loc.start);
        const col = loc.start - endings[line];
        return `${src}:${line + 1}:${col}`;
    }
}
exports.default = sourceMap;
function* indexesOf(text, substr = '\n') {
    let offset = 0;
    while ((offset = text.indexOf(substr, offset)) !== -1) {
        yield offset;
        offset += substr.length;
    }
}
const nullMap = (loc) => {
    var _a;
    return loc
        ? `<unknown source>[offset ${(_a = locationFrom(loc)) === null || _a === void 0 ? void 0 : _a.start}]`
        : `<unknown source>[unknown]`;
};
//# sourceMappingURL=source.js.map
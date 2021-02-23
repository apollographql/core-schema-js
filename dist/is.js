"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAst = exports.isEmpty = exports.isNonEmpty = exports.asString = exports.isAsString = exports.isTemplate = void 0;
const knownTemplates = new WeakSet;
const isTemplate = (args) => knownTemplates.has(args) || !!(Array.isArray(args[0]) &&
    args[0].every(x => typeof x === 'string') &&
    args[0].length === args.length &&
    knownTemplates.add(args[0]));
exports.isTemplate = isTemplate;
const isAsString = (args) => exports.isTemplate(args) || (args.length === 1 && typeof args[0] === 'string');
exports.isAsString = isAsString;
function asString(input) {
    return (!exports.isAsString(input)
        ? undefined
        :
            exports.isTemplate(input)
                ? String.raw(...input)
                : input[0]);
}
exports.asString = asString;
function isNonEmpty(input) {
    return !isEmpty(input);
}
exports.isNonEmpty = isNonEmpty;
function isEmpty(input) {
    return !input.length;
}
exports.isEmpty = isEmpty;
function isAst(obj, ...kinds) {
    return kinds.indexOf(obj === null || obj === void 0 ? void 0 : obj.kind) !== -1;
}
exports.isAst = isAst;
//# sourceMappingURL=is.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.directive = void 0;
exports.default = directive;
function directive(spec, name, args, repeat, ...locations) {
    return {
        spec,
        name,
        args,
        repeatable: repeat === 'repeatable on',
        locations,
    };
}
exports.directive = directive;
//# sourceMappingURL=directive.js.map
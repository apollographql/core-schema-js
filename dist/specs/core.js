"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.surface = exports.using = exports.SpecUrl = void 0;
const graphql_1 = require("graphql");
const spec_1 = require("../spec");
const bind_1 = require("../bind");
const serde_1 = require("../serde");
exports.SpecUrl = bind_1.scalar('https://lib.apollo.dev/core/v0.1', 'SpecUrl', spec_1.Spec);
exports.using = bind_1.directive('https://lib.apollo.dev/core/v0.1', 'core', {
    using: serde_1.must(exports.SpecUrl),
    as: serde_1.Str,
    export: serde_1.Bool,
}, 'repeatable on', 'SCHEMA');
exports.surface = bind_1.directive('https://lib.apollo.dev/core/v0.1', 'core__surface', {
    export: serde_1.must(serde_1.Bool)
}, 'on', ...Object.values(graphql_1.DirectiveLocation));
exports.default = exports.using;
//# sourceMappingURL=core.js.map
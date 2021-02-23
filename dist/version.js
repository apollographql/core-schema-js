"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Version = exports.ErrVersionParse = void 0;
const err_1 = __importStar(require("./err"));
const is_1 = require("./is");
exports.default = (...input) => Version.from(...input);
exports.ErrVersionParse = err_1.default `VersionParse`((props) => `expected a version specifier like "v9.8", got "${props.got}"`);
class Version {
    constructor(major, minor) {
        this.major = major;
        this.minor = minor;
    }
    static parse(input) {
        return this.decode(input).unwrap();
    }
    static decode(input) {
        const match = input.match(this.VERSION_RE);
        if (!match)
            return exports.ErrVersionParse({ got: input });
        return err_1.ok(new this(+match[1], +match[2]));
    }
    static from(...input) {
        const str = is_1.asString(input);
        return str
            ? Version.parse(str.startsWith('v') ? str : `v${str}`)
            : new Version(...input);
    }
    satisfies(required) {
        const { major, minor } = this;
        const { major: rMajor, minor: rMinor } = required;
        return rMajor == major && (major == 0
            ? rMinor == minor
            : rMinor <= minor);
    }
    toString() {
        return `v${this.major}.${this.minor}`;
    }
}
exports.Version = Version;
Version.VERSION_RE = /^v(\d+)\.(\d+)$/;
//# sourceMappingURL=version.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.spec = exports.Spec = exports.ErrNoVersion = exports.ErrNoName = exports.ErrNoPath = void 0;
const url_1 = require("url");
const err_1 = require("./err");
const is_1 = require("./is");
const version_1 = require("./version");
const err_2 = __importDefault(require("./err"));
exports.ErrNoPath = err_2.default `NoPath`(({ url }) => `spec url does not have a path: ${url}`);
exports.ErrNoName = err_2.default `NoName`(({ url }) => `spec url does not specify a name: ${url}`);
exports.ErrNoVersion = err_2.default `NoVersion`(({ url }) => `spec url does not specify a version: ${url}`);
class Spec {
    constructor(identity, name, version) {
        this.identity = identity;
        this.name = name;
        this.version = version;
    }
    static parse(input) {
        return this.decode(input).unwrap();
    }
    static decode(input) {
        const result = parseUrl(input);
        if (err_1.isErr(result))
            return result;
        const url = result.ok;
        const path = url.pathname.split('/');
        const verStr = path.pop();
        if (!verStr)
            return exports.ErrNoVersion({ url });
        const version = version_1.Version.parse(verStr);
        const name = path[path.length - 1];
        if (!name)
            throw exports.ErrNoName({ url });
        url.hash = '';
        url.search = '';
        url.password = '';
        url.username = '';
        url.pathname = path.join('/');
        return err_1.ok(new Spec(url.toString(), name, version));
    }
    satisfies(requested) {
        return requested.identity === this.identity &&
            this.version.satisfies(requested.version);
    }
    get url() {
        return `${this.identity}/${this.version}`;
    }
    toString() {
        return `Spec <${this.url}>`;
    }
}
exports.Spec = Spec;
const parseUrl = err_1.asResultFn((url) => new url_1.URL(url));
const spec = (...input) => Spec.parse(is_1.asString(input));
exports.spec = spec;
//# sourceMappingURL=spec.js.map
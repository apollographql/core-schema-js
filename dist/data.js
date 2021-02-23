"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get = exports.set = exports.derive = exports.data = void 0;
const read = Symbol('Get column value');
const write = Symbol('Set column value');
function data(description) {
    const column = col(description);
    return Object.assign(column[read], column);
}
exports.data = data;
function derive(description, fn) {
    const column = col(description);
    const derived = {
        [read]: (source) => {
            const existing = column[read](source, NotFound);
            if (existing !== NotFound)
                return existing;
            const created = fn(source);
            column[write](source, created);
            return created;
        }
    };
    return Object.assign(derived[read], derived);
}
exports.derive = derive;
const NotFound = Object.freeze({});
function set(source, col, value) {
    col[write](source, value);
}
exports.set = set;
function get(source, col, defaultValue) {
    return col[read](source, defaultValue);
}
exports.get = get;
function col(description) {
    const symbol = Symbol(description);
    return {
        [read]: (source, defaultValue) => (source &&
            typeof source === 'object' &&
            symbol in source) ? source[symbol] : defaultValue,
        [write]: (source, value) => source[symbol] = value,
    };
}
//# sourceMappingURL=data.js.map
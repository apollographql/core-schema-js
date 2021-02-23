"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pipe = void 0;
class Pipe {
    constructor(data) {
        this.data = data;
    }
    static from(data) {
        return new Pipe(data);
    }
    into(op) {
        return op.apply(null, [this]);
    }
    to(op) {
        return new Pipe(op(this.data));
    }
    output() { return this.data; }
}
exports.Pipe = Pipe;
//# sourceMappingURL=pipe.js.map
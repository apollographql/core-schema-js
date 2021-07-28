import Core, { Cell, Context, Immutable, ROLLBACK } from "../core";

describe("core.get", () => {
  it("evaluates core fns against the stored value", () => {
    const core = new Core(4);
    expect(core.get((core) => core.data ** 2)).toEqual(16);
  });

  it("re-evaluates functions every time if they never call pure()", () => {
    const core = new Core(4);
    let count = 0;
    const incr = () => ++count;
    core.get(incr);
    core.get(incr);
    core.get(incr);
    expect(count).toEqual(3);
  });

  it("throws NoData if the fn returns undefined", () => {
    const core = new Core(4);
    expect(() => core.get(() => void 0)).toThrowErrorMatchingInlineSnapshot(
      `"no data"`
    );
  });

  it("throws the underlying exception if the fn throws", () => {
    const core = new Core(4);
    expect(() =>
      core.get(() => {
        throw new Error("ahhhh");
      })
    ).toThrowErrorMatchingInlineSnapshot(`"ahhhh"`);
  });

  it("throws NoData if there are multiple errors", () => {
    const core = new Core(0);
    expect(() => {
      core.get((core) => {
        core.report(new Error("a"));
        core.report(new Error("b"));
      });
    }).toThrowErrorMatchingInlineSnapshot(`"no data"`);
  });

  it("does not re-evaluate if pure() arguments haven't changed", () => {
    const core = new Core(4);
    let count = 0;
    function incr(this: Immutable<Core<number>> & Context) {
      this.pure(this.data);
      ++count;
      return this.data ** 2;
    }
    expect(core.get(incr)).toEqual(16);
    core.get(incr);
    core.get(incr);
    core.get(incr);
    expect(count).toEqual(1);
  });

  it("does re-evaluate if pure() arguments have changed", () => {
    const core = new Core(4);
    let count = 0;
    function incr(this: Immutable<Core<number>> & Context) {
      this.pure("a", "b", "c", this.data);
      ++count;
      return this.data ** 2;
    }
    expect(core.get(incr)).toEqual(16);
    core.get(incr);
    core.get(incr);
    core.update(() => 2);
    expect(core.get(incr)).toEqual(4);
    core.get(incr);
    expect(count).toEqual(2);
  });
});

describe("weird ways core can fail", () => {
  it("throws EvalStackEmpty if you access .currentCell outside of an executing corefn (types generally prevent this)", () => {
    expect(
      () => (new Core("") as any).currentCell
    ).toThrowErrorMatchingInlineSnapshot(
      `"this method must only be called from an evaluator, during evaluation. no evaluation is ongoing."`
    );
  });
});

describe("cell", () => {
  describe("evaluate(core, fn)", () => {
    it("saves return results in this.result.data", () => {
      const cell = new Cell();
      // note: typically, cell.evaluate is called with a Core, which
      // maintains an cell execution stack and dispatches .report and .pure
      // calls to the top cell. that logic is tested in the above core tests.
      // to just test the cell, we're passing in the cell itself as the core
      // in these tests. this works because it's the cell which implements
      // .report and .pure, not the core itself.
      cell.evaluate(cell as any, () => "hello world");
      expect(cell.result).toEqual({
        data: "hello world",
      });
    });

    it("captures thrown errors as this.result.errors", () => {
      const cell = new Cell();
      cell.evaluate(cell as any, () => {
        throw "oops";
      });
      expect(cell.result).toEqual({
        errors: ["oops"],
      });
    });

    it("captures errors reported with .report in this.result.errors when the fn still returns data", () => {
      const cell = new Cell();
      cell.evaluate(cell as any, (ctx) => {
        ctx.report(new Error("oops"));
        ctx.report(new Error("another error"));
        return "but i could still get some data";
      });

      expect(cell.result).toMatchInlineSnapshot(`
        Object {
          "data": "but i could still get some data",
          "errors": Array [
            [Error: oops],
            [Error: another error],
          ],
        }
      `);
    });

    it("captures errors reported with .report and appends a thrown error", () => {
      const cell = new Cell();
      cell.evaluate(cell as any, (ctx) => {
        ctx.report(new Error("oops"));
        ctx.report(new Error("another error"));
        throw new Error("aaaand this one killed us");
      });

      expect(cell.result).toMatchInlineSnapshot(`
        Object {
          "errors": Array [
            [Error: oops],
            [Error: another error],
            [Error: aaaand this one killed us],
          ],
        }
      `);
    });

    it("halts evaluation and returns the previous result if ROLLBACK is thrown", () => {
      const cell = new Cell();
      cell.evaluate(cell as any, () => "some data");
      const firstResult = cell.result;
      expect(firstResult).toMatchInlineSnapshot(`
        Object {
          "data": "some data",
        }
      `);

      cell.evaluate(cell as any, (ctx) => {
        ctx.report(
          new Error("this error will get discarded when we roll back")
        );
        throw ROLLBACK;
      });
      expect(cell.result).toBe(firstResult);
    });

    it("rolls back the result to undefined if there wasn't a previous result", () => {
      const cell = new Cell();
      cell.evaluate(cell as any, () => {
        throw ROLLBACK;
      });
      expect(cell.result).toBeUndefined();
    });
  });

  describe("pure(...key)", () => {
    it("does nothing if the cell has never evaluated before", () => {
      const cell = new Cell();
      cell.evaluate(cell as any, (ctx) => {
        ctx.pure("a");
        return "some data";
      });
      expect(cell.result).toEqual({ data: "some data" });
    });

    it("does nothing if the cell HAS evaluated before but pure() was called with different args", () => {
      const cell = new Cell();
      cell.evaluate(cell as any, (ctx) => {
        ctx.pure("a");
        return "first data";
      });
      cell.evaluate(cell as any, (ctx) => {
        ctx.pure("b");
        return "second data";
      });
      expect(cell.result).toEqual({ data: "second data" });
    });

    it("caches errors", () => {
      const cell = new Cell();
      cell.evaluate(cell as any, (ctx) => {
        ctx.pure("a", "b", "c");
        ctx.report(new Error("a reported error"));
        throw new Error("first error");
      });
      cell.evaluate(cell as any, (ctx) => {
        ctx.pure("a", "b", "c");
        throw new Error("second error");
      });
      expect(cell.result).toMatchInlineSnapshot(`
        Object {
          "errors": Array [
            [Error: a reported error],
            [Error: first error],
          ],
        }
      `);
    });

    it("can be called multiple times and will roll back if any call fails to compare its args to the previous evaluation", () => {
      const cell = new Cell();
      cell.evaluate(cell as any, (ctx) => {
        ctx.pure("a", "b", "c");
        ctx.report(new Error("some error"));
        ctx.pure(1, 2, 3);
        return "hello, world";
      });
      cell.evaluate(cell as any, (ctx) => {
        ctx.pure("x", "z", "y");
        ctx.pure(1, 2, 3);
        return "new data will be discarded";
      });
      expect(cell.result).toMatchInlineSnapshot(`
        Object {
          "data": "hello, world",
          "errors": Array [
            [Error: some error],
          ],
        }
      `);
    });

    it("halts evaluation immediately", () => {
      const cell = new Cell();
      let count = 0      
      cell.evaluate(cell as any, ctx => {
        ctx.pure('a')
        return ++count
      })
      cell.evaluate(cell as any, ctx => {
        ctx.pure('a')
        return ++count
      })
      expect(count).toBe(1)
      expect(cell.result).toEqual({ data: 1 })
    })
  });
});

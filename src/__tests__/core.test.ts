import Core, { Context, Immutable } from "../core";

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
    let count = 0
    function incr(this: Immutable<Core<number>> & Context) {
      this.pure(this.data)
      ++count
      return this.data ** 2
    }
    expect(core.get(incr)).toEqual(16)
    core.get(incr)
    core.get(incr)
    core.get(incr)
    expect(count).toEqual(1)
  })

  it("does re-evaluate if pure() arguments have changed", () => {
    const core = new Core(4);
    let count = 0
    function incr(this: Immutable<Core<number>> & Context) {
      this.pure('a', 'b', 'c', this.data)
      ++count
      return this.data ** 2
    }
    expect(core.get(incr)).toEqual(16)
    core.get(incr)
    core.get(incr)
    core.update(() => 2)
    expect(core.get(incr)).toEqual(4)
    core.get(incr)
    expect(count).toEqual(2)
  })
});

describe("ways core can fail", () => {
  it("throws EvalStackEmpty if you access .currentCell outside of an executing corefn", () => {
    expect(
      () => (new Core("") as any).currentCell
    ).toThrowErrorMatchingInlineSnapshot(
      `"this method must only be called from an evaluator, during evaluation. no evaluation is ongoing."`
    );
  });
});

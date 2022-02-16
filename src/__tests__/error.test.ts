import { ErrCheckFailed } from "../core";
import { GraphQLErrorExt } from "../error";

describe("GraphQLErrorExt", () => {
  it("correctly self-assigns its name property", () => {
    const error = ErrCheckFailed([]);
    expect(error.name).toEqual("CheckFailed");
  });

  it("calling `toString` doesn't throw an error", () => {
    const error = new GraphQLErrorExt("CheckFailed", "Check failed");
    expect(() => error.toString()).not.toThrow();
  });

  it("calling `toString` prints the error", () => {
    const error = new GraphQLErrorExt("CheckFailed", "Check failed");
    expect(error.toString()).toMatchInlineSnapshot(
      `"[CheckFailed] Check failed"`
    );
  });
});

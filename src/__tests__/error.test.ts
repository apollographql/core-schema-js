import { ErrCheckFailed } from "../core";

describe("GraphQLErrorExt", () => {
  it("correctly self-assigns its name property", () => {
    const error = ErrCheckFailed([]);
    expect(error.name).toEqual("CheckFailed");
  });
});

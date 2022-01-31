import err from '../error'

describe("GraphQLErrorExt", () => {
  it("sets a code, name, and message", () => {
    const error = err('SomethingWentWrong', 'it is very bad')
    expect(error.name).toEqual("SomethingWentWrong");
    expect(error.code).toEqual(error.name);
    expect(error.message).toEqual("it is very bad");
  });
});

import { Version } from "../version";

describe("version", () => {
  describe(".parse", () => {
    it(".parse parses valid version tags", () => {
      expect(Version.parse("v1.0")).toEqual(new Version(1, 0));
      expect(Version.parse("v0.1")).toEqual(new Version(0, 1));
      expect(Version.parse("v987.65432")).toEqual(new Version(987, 65432));
    });

    it("throws on invalid versions", () => {
      expect(() => Version.parse("bloop")).toThrowErrorMatchingInlineSnapshot(
        `"expected a version specifier like \\"v9.8\\", got \\"bloop\\""`
      );
      expect(() => Version.parse("v1")).toThrowErrorMatchingInlineSnapshot(
        `"expected a version specifier like \\"v9.8\\", got \\"v1\\""`
      );
      expect(() => Version.parse("v1.")).toThrowErrorMatchingInlineSnapshot(
        `"expected a version specifier like \\"v9.8\\", got \\"v1.\\""`
      );
      expect(() => Version.parse("1.2")).toThrowErrorMatchingInlineSnapshot(
        `"expected a version specifier like \\"v9.8\\", got \\"1.2\\""`
      );
      expect(() =>
        Version.parse("v0.9-tags-are-not-supported")
      ).toThrowErrorMatchingInlineSnapshot(
        `"expected a version specifier like \\"v9.8\\", got \\"v0.9-tags-are-not-supported\\""`
      );
    });
  });
  describe(".satisfies", () => {
    it("returns true if this version satisfies the requested version", () => {
      expect(new Version(1, 0).satisfies(new Version(1, 0))).toBe(true);
      expect(new Version(1, 2).satisfies(new Version(1, 0))).toBe(true);
    });

    it("returns false if this version cannot satisfy the requested version", () => {
      expect(new Version(2, 0).satisfies(new Version(1, 9))).toBe(false);
      expect(new Version(0, 9).satisfies(new Version(0, 8))).toBe(false);
    });
  });
  it(".equals returns true iff the versions are exactly equal", () => {
    expect(new Version(2, 9).equals(new Version(2, 9))).toBe(true);
    expect(new Version(2, 9).equals(new Version(2, 8))).toBe(false);
  });
});

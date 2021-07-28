import FeatureUrl from "../feature-url";

describe("FeatureUrl", () => {
  describe(".parse parses input strings", () => {
    it("parses a valid simple feature url", () => {
      expect(FeatureUrl.parse("https://specs.apollo.dev/core/v1.2"))
        .toMatchInlineSnapshot(`
        FeatureUrl {
          "element": undefined,
          "identity": "https://specs.apollo.dev/core",
          "name": "core",
          "version": Version {
            "major": 1,
            "minor": 2,
          },
        }
      `);
    });

    it("parses valid feature urls with an element hashes", () => {
      expect(FeatureUrl.parse("https://specs.apollo.dev/core/v1.2#@core"))
        .toMatchInlineSnapshot(`
        FeatureUrl {
          "element": "@core",
          "identity": "https://specs.apollo.dev/core",
          "name": "core",
          "version": Version {
            "major": 1,
            "minor": 2,
          },
        }
      `);

      expect(FeatureUrl.parse("https://specs.apollo.dev/core/v1.2#Purpose"))
        .toMatchInlineSnapshot(`
        FeatureUrl {
          "element": "Purpose",
          "identity": "https://specs.apollo.dev/core",
          "name": "core",
          "version": Version {
            "major": 1,
            "minor": 2,
          },
        }
      `);
    });

    it("throws NoVersion on urls without version tags", () => {
      expect(() =>
        FeatureUrl.parse("https://specs.apollo.dev/core")
      ).toThrowErrorMatchingInlineSnapshot(
        `"expected a version specifier like \\"v9.8\\", got \\"core\\""`
      );
    });

    it("throws NoName on urls without a name", () => {
      expect(() =>
        FeatureUrl.parse("https://specs.apollo.dev/v1.1")
      ).toThrowErrorMatchingInlineSnapshot(
        `"feature url does not specify a name: https://specs.apollo.dev/v1.1"`
      );
    });

    it("throws NoPath on urls without a path at all", () => {
      expect(() =>
        FeatureUrl.parse("https://specs.apollo.dev/")
      ).toThrowErrorMatchingInlineSnapshot(
        `"feature url does not have a path: https://specs.apollo.dev/"`
      );

      expect(() =>
        FeatureUrl.parse("https://specs.apollo.dev")
      ).toThrowErrorMatchingInlineSnapshot(
        `"feature url does not have a path: https://specs.apollo.dev/"`
      );
    });
  });

  describe(".isDirective", () => {
    it("is undefined if no element hash is specified", () => {
      expect(
        FeatureUrl.parse("https://specs.apollo.dev/core/v0.9").isDirective
      ).toBe(void 0);
    });

    it("is false if a non-directive element hash is specified", () => {
      expect(
        FeatureUrl.parse("https://specs.apollo.dev/core/v0.9#someElement")
          .isDirective
      ).toBe(false);
    });

    it("is true if a directive element hash is specified", () => {
      expect(
        FeatureUrl.parse("https://specs.apollo.dev/core/v0.9#@core").isDirective
      ).toBe(true);
    });
  });
});

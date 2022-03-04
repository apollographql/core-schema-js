import { DirectiveNode, parse } from "graphql";
import { Linker } from "../linker";
import GRef from "../hgref";

describe("Linker", () => {
  describe("synthesize", () => {
    const linker = Linker.bootstrap(
      dir('@link(url: "https://specs.apollo.dev/link/v0.3")')
    )!;

    it("does not reference a schema by name unless it has a link", () => {
      expect(
        linker.synthesize([
          {
            name: "@key",
            gref: GRef.directive(
              "key",
              "https://specs.apollo.dev/federation"
            ),
          },
        ]),
      ).toMatchInlineSnapshot(`
        Iterable [
          <https://specs.apollo.dev/link/v0.3#@>[+] @link(url: "https://specs.apollo.dev/federation", as: "", import: "@key"),
        ]
      `);

      expect(
        linker.synthesize([
          {
            name: "@key",
            gref: GRef.directive(
              "key",
              "https://specs.apollo.dev/federation"
            ),
          },

          {
            name: "federation",
            gref: GRef.schema("https://specs.apollo.dev/federation"),
          },
        ])
      ).toMatchInlineSnapshot(`
        Iterable [
          <https://specs.apollo.dev/link/v0.3#@>[+] @link(url: "https://specs.apollo.dev/federation", import: "@key"),
        ]
      `);

      expect(
        linker.synthesize([
          {
            name: "@key",
            gref: GRef.directive(
              "key",
              "https://specs.apollo.dev/federation"
            ),
          },

          {
            name: "fed",
            gref: GRef.schema("https://specs.apollo.dev/federation"),
          },
        ]),
      ).toMatchInlineSnapshot(`
        Iterable [
          <https://specs.apollo.dev/link/v0.3#@>[+] @link(url: "https://specs.apollo.dev/federation", as: "fed", import: "@key"),
        ]
      `);
    });

    it("collects imports", () => {
      expect(
        linker.synthesize([
          {
            name: "@key",
            gref: GRef.directive(
              "key",
              "https://specs.apollo.dev/federation"
            ),
          },

          {
            name: "fed",
            gref: GRef.schema("https://specs.apollo.dev/federation"),
          },

          {
            name: "Graph",
            gref: GRef.named("Graph", "https://specs.apollo.dev/join"),
          },

          {
            name: "@joinType",
            gref: GRef.directive("type", "https://specs.apollo.dev/join"),
          },
        ]),
      ).toMatchInlineSnapshot(`
        Iterable [
          <https://specs.apollo.dev/link/v0.3#@>[+] @link(url: "https://specs.apollo.dev/federation", as: "fed", import: "@key"),
          <https://specs.apollo.dev/link/v0.3#@>[+] @link(url: "https://specs.apollo.dev/join", as: "", import: "Graph @joinType: @type"),
        ]
      `);
    });
  });
});

function dir(source: string): DirectiveNode {
  return (parse(`extend schema ` + source).definitions[0] as any)
    .directives![0];
}

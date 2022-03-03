import { DirectiveNode, parse, print } from "graphql";
import { Linker } from "../bootstrap";
import HgRef from "../hgref";

describe("Linker", () => {
  describe("synthesize", () => {
    const linker = Linker.bootstrap(
      dir('@link(url: "https://specs.apollo.dev/link/v0.3")')
    );

    it("does not reference a schema by name unless it has a link", () => {
      expect([
        ...linker.synthesize([
          {
            name: "@key",
            hgref: HgRef.directive(
              "key",
              "https://specs.apollo.dev/federation"
            ),
          },
        ]),
      ]).toMatchInlineSnapshot(`
        Array [
          <https://specs.apollo.dev/link/v0.3#@>[+] @link(url: "https://specs.apollo.dev/federation", as: "", import: "@key"),
        ]
      `);

      expect([
        ...linker.synthesize([
          {
            name: "@key",
            hgref: HgRef.directive(
              "key",
              "https://specs.apollo.dev/federation"
            ),
          },

          {
            name: "federation",
            hgref: HgRef.schema("https://specs.apollo.dev/federation"),
          },
        ]),
      ]).toMatchInlineSnapshot(`
        Array [
          <https://specs.apollo.dev/link/v0.3#@>[+] @link(url: "https://specs.apollo.dev/federation", import: "@key"),
        ]
      `);

      expect([
        ...linker.synthesize([
          {
            name: "@key",
            hgref: HgRef.directive(
              "key",
              "https://specs.apollo.dev/federation"
            ),
          },

          {
            name: "fed",
            hgref: HgRef.schema("https://specs.apollo.dev/federation"),
          },
        ]),
      ]).toMatchInlineSnapshot(`
        Array [
          <https://specs.apollo.dev/link/v0.3#@>[+] @link(url: "https://specs.apollo.dev/federation", as: "fed", import: "@key"),
        ]
      `);
    });

    it("collects imports", () => {
      expect([
        ...linker.synthesize([
          {
            name: "@key",
            hgref: HgRef.directive(
              "key",
              "https://specs.apollo.dev/federation"
            ),
          },

          {
            name: "fed",
            hgref: HgRef.schema("https://specs.apollo.dev/federation"),
          },

          {
            name: "Graph",
            hgref: HgRef.named("Graph", "https://specs.apollo.dev/join"),
          },

          {
            name: "@joinType",
            hgref: HgRef.directive("type", "https://specs.apollo.dev/join"),
          },
        ]),
      ]).toMatchInlineSnapshot(`
        Array [
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

import fromSource, { ensure, errors, using } from "../schema";
import { documentOf } from "../linkage";

describe("schemas", () => {
  it("fromSource parses a schema AST from source", () => {
    const example = fromSource`
          schema @core(using: "https://lib.apollo.dev/core/v0.1")
          { query: Query }
        `.value;
    expect(errors(example).length).toEqual(0);
  });

  it("extracts all spec references and exposes them as `.using`", () => {
    const example = fromSource`
          schema @core(using: "https://lib.apollo.dev/core/v0.1")
          { query: Query }
        `.value;

    expect(using(example)).toMatchInlineSnapshot(`
        Array [
          Object {
            "as": null,
            "using": Spec {
              "identity": "https://lib.apollo.dev/core",
              "name": "core",
              "version": Version {
                "major": 0,
                "minor": 1,
              },
            },
          },
        ]
      `);
  });

  describe("ensure", () => {
    it("throws if there are errors on the document", () => {
      const example = fromSource({
        src: "extra-schema.graphql",
        text: `
          schema @core(using: "https://lib.apollo.dev/core/v0.1")
          { query: Query }

          # error: extra schema
          schema { query: Query }
        `,
      }).value;

      expect(() => ensure(example)).toThrowErrorMatchingInlineSnapshot(`
        "[DocumentNotOk] extra-schema.graphql:1:0: one or more errors on document
          - [ExtraSchema] extra-schema.graphql:5:11: extra schema definition ignored"
      `);
    });
  });

  describe("documentOf", () => {
    it("returns the document node for a definition", () => {
      const example = fromSource({
        src: "extra-schema.graphql",
        text: `
          schema @core(using: "https://lib.apollo.dev/core/v0.1")
          { query: Query }

          type Query { int: Int }
        `,
      }).value;

      expect(documentOf(example.definitions[1])).toBe(example);

      // deeply
      expect(documentOf((example.definitions[1] as any).fields[0])).toBe(
        example
      );
    });
  });
});

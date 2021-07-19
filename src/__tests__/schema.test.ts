import Core from "../core";
import { addPaths } from "../path";

describe("Core", () => {
  it(".graphql parses a schema AST from inline source", () => {
    const example = Core.graphql`
          schema @core(feature: "https://specs.apollo.dev/core/v0.1")
          { query: Query }
        `;
    expect(example.errors.length).toEqual(0);
  });

  it("extracts all feature references and exposes them as `.features`", () => {
    const example = Core.graphql`
          schema @core(feature: "https://specs.apollo.dev/core/v0.1")
          { query: Query }
        `;
    addPaths(example.document);

    expect(example.features).toMatchInlineSnapshot(`
      Features {
        "features": Map {
          "https://specs.apollo.dev/core" => Map {
            "v0.1" => Array [
              Object {
                "directive": Directive <definitions/0/directives/0>,
                "name": "core",
                "purpose": undefined,
                "url": FeatureUrl {
                  "identity": "https://specs.apollo.dev/core",
                  "name": "core",
                  "version": Version {
                    "major": 0,
                    "minor": 1,
                  },
                },
              },
            ],
          },
        },
      }
    `);
  });
});

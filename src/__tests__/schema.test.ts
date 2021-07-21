import {
  GraphQLDirective,
  GraphQLString,
  ObjectTypeDefinitionNode,
} from "graphql";
import CoreSchema from "../schema";

describe("CoreSchema", () => {
  it(".graphql parses a schema AST from inline source", () => {
    const example = CoreSchema.graphql`
          schema @core(feature: "https://specs.apollo.dev/core/v0.1")
          { query: Query }
        `;
    expect(example.document.kind).toEqual("Document");
    expect(() => example.check()).not.toThrow();
  });

  it("extracts all feature references and exposes them as `.features`", () => {
    const example = CoreSchema.graphql`
          schema @core(feature: "https://specs.apollo.dev/core/v0.1")
          { query: Query }
        `;

    expect(example.features).toMatchInlineSnapshot(`
      Features {
        "features": Map {
          "https://specs.apollo.dev/core" => Map {
            "v0.1" => Array [
              Object {
                "directive": (inline graphql):2:18
      1 |
      2 |           schema @core(feature: "https://specs.apollo.dev/core/v0.1")
        |                  ^
      3 |           { query: Query },
                "name": "core",
                "purpose": undefined,
                "url": FeatureUrl {
                  "element": undefined,
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

  it("extracts all names and exposes them as `.names`", () => {
    const example = CoreSchema.graphql`
          schema @core(feature: "https://specs.apollo.dev/core/v0.1")
            @core(feature: "https://example.com/other/v1.0")
            @core(feature: "https://two.example.com/other/v1.2", as: "another")
          { query: Query }
        `;

    expect(example.names).toMatchInlineSnapshot(`
      Map {
        "core" => Object {
          "directive": (inline graphql):2:18
      1 |
      2 |           schema @core(feature: "https://specs.apollo.dev/core/v0.1")
        |                  ^
      3 |             @core(feature: "https://example.com/other/v1.0"),
          "name": "core",
          "purpose": undefined,
          "url": FeatureUrl {
            "element": undefined,
            "identity": "https://specs.apollo.dev/core",
            "name": "core",
            "version": Version {
              "major": 0,
              "minor": 1,
            },
          },
        },
        "other" => Object {
          "directive": (inline graphql):3:13
      2 |           schema @core(feature: "https://specs.apollo.dev/core/v0.1")
      3 |             @core(feature: "https://example.com/other/v1.0")
        |             ^
      4 |             @core(feature: "https://two.example.com/other/v1.2", as: "another"),
          "name": "other",
          "purpose": undefined,
          "url": FeatureUrl {
            "element": undefined,
            "identity": "https://example.com/other",
            "name": "other",
            "version": Version {
              "major": 1,
              "minor": 0,
            },
          },
        },
        "another" => Object {
          "directive": (inline graphql):4:13
      3 |             @core(feature: "https://example.com/other/v1.0")
      4 |             @core(feature: "https://two.example.com/other/v1.2", as: "another")
        |             ^
      5 |           { query: Query },
          "name": "another",
          "purpose": undefined,
          "url": FeatureUrl {
            "element": undefined,
            "identity": "https://two.example.com/other",
            "name": "other",
            "version": Version {
              "major": 1,
              "minor": 2,
            },
          },
        },
      }
    `);
  });

  it("finds document names with .features.documentName", () => {
    const example = CoreSchema.graphql`
          schema @core(feature: "https://specs.apollo.dev/core/v0.1")
            @core(feature: "https://example.com/other/v1.0")
            @core(feature: "https://two.example.com/other/v1.2", as: "another")
          { query: Query }
        `;

    expect(
      example.features.documentName("https://example.com/other/v1.0#item")
    ).toEqual("other__item");
    expect(
      example.features.documentName("https://two.example.com/other/v1.2#@other")
    ).toEqual("another");
  });

  it("extracts metadata with .read", () => {
    const example = CoreSchema.graphql`
          schema @core(feature: "https://specs.apollo.dev/core/v0.1")
            @core(feature: "https://example.com/other/v1.0")
            @core(feature: "https://two.example.com/other/v1.2", as: "another")
          { query: Query }

          type User @other(input: "hello") {
            field: Int @another
          }
        `;

    const other = new GraphQLDirective({
      name: "@other",
      locations: ["OBJECT", "FIELD_DEFINITION"],
      args: {
        input: { type: GraphQLString },
      },
      extensions: {
        specifiedBy: "https://example.com/other/v1.0#@other",
      },
    });

    const another = new GraphQLDirective({
      name: "@other",
      locations: ["OBJECT", "FIELD_DEFINITION"],
      extensions: {
        specifiedBy: "https://two.example.com/other/v1.2#@other",
      },
    });

    const user: ObjectTypeDefinitionNode = example.document
      .definitions[1] as any;
    const field = user.fields[0];
    expect([...example.read(user, other)]).toMatchInlineSnapshot(`
      Array [
        Object {
          "data": Object {
            "input": "hello",
          },
          "directive": (inline graphql):7:21
      6 |
      7 |           type User @other(input: "hello") {
        |                     ^
      8 |             field: Int @another,
          "node": (inline graphql):7:11
      6 |
      7 |           type User @other(input: "hello") {
        |           ^
      8 |             field: Int @another,
        },
      ]
    `);

    expect([...example.read(user, another)]).toMatchInlineSnapshot(`Array []`);

    expect([...example.read(field, other)]).toMatchInlineSnapshot(`Array []`);

    expect([...example.read(field, another)]).toMatchInlineSnapshot(`
      Array [
        Object {
          "data": Object {},
          "directive": (inline graphql):8:24
      7 |           type User @other(input: "hello") {
      8 |             field: Int @another
        |                        ^
      9 |           },
          "node": (inline graphql):8:13
      7 |           type User @other(input: "hello") {
      8 |             field: Int @another
        |             ^
      9 |           },
        },
      ]
    `);
  });
});

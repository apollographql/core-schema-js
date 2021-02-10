import { fromSource, schemaDef } from "../schema";
import { namespaces, namespaceOf, isExport, exportSchema } from "../namespace";
import {
  EnumTypeDefinitionNode,
  ObjectTypeDefinitionNode,
  print,
} from "graphql";

describe("Namespaces", () => {
  it("namespaces(doc) returns a map of namespaces", () => {
    const ns = fromSource`
      schema
        @core(using: "https://lib.apollo.dev/core/v0.1")
        @core(using: "https://example.com/someSpec/v1.0")
        @core(using: "https://spec.example.io/another/v1.0", as: "renamed", export: true)
      { query: Query }
      `.map(namespaces).value;
    expect(ns).toMatchInlineSnapshot(`
      Map {
        "core" => Object {
          "export": false,
          "name": "core",
          "spec": Spec {
            "identity": "https://lib.apollo.dev/core",
            "name": "core",
            "version": Version {
              "major": 0,
              "minor": 1,
            },
          },
        },
        "someSpec" => Object {
          "export": false,
          "name": "someSpec",
          "spec": Spec {
            "identity": "https://example.com/someSpec",
            "name": "someSpec",
            "version": Version {
              "major": 1,
              "minor": 0,
            },
          },
        },
        "renamed" => Object {
          "export": true,
          "name": "renamed",
          "spec": Spec {
            "identity": "https://spec.example.io/another",
            "name": "another",
            "version": Version {
              "major": 1,
              "minor": 0,
            },
          },
        },
      }
    `);
  });

  it("namespaceOf returns the namespace for a single definition", () => {
    const namespacedNode = fromSource`
      schema
        @core(using: "https://lib.apollo.dev/core/v0.1")
        @core(using: "https://example.com/someSpec/v1.0")
        @core(using: "https://spec.example.io/another/v1.0", as: "renamed", export: true)
      { query: Query }

      enum someSpec__SomeEnum {
        SOME_VALUE
      }
      `.value.definitions[1];

    expect(namespaceOf(namespacedNode)).toMatchInlineSnapshot(`
      Object {
        "export": false,
        "name": "someSpec",
        "spec": Spec {
          "identity": "https://example.com/someSpec",
          "name": "someSpec",
          "version": Version {
            "major": 1,
            "minor": 0,
          },
        },
      }
    `);
  });

  it("isExport returns true if the node is part of the export schema", () => {
    const doc = fromSource`
      schema
        @core(using: "https://lib.apollo.dev/core/v0.1")
        @core(using: "https://example.com/someSpec/v1.0")
        @core(using: "https://spec.example.io/another/v1.0", as: "renamed", export: true)
      { query: Query }

      type Query {
        field: Int
      }

      enum someSpec__SomeEnum {
        SOME_VALUE
      }`;

    const schema = schemaDef(doc.value)!;
    const queryType = doc.value.definitions[1]! as ObjectTypeDefinitionNode;
    const someEnum = doc.value.definitions[2]! as EnumTypeDefinitionNode;

    expect(isExport(schema)).toBe(true);
    expect(isExport(schema.directives![0])).toBe(false);
    expect(isExport(queryType)).toBe(true);
    expect(isExport(someEnum)).toBe(false);
  });

  it("exportSchema removes all machinery and retains all exported items", () => {
    const exported = fromSource`
      schema
        @core(using: "https://lib.apollo.dev/core/v0.1")
        @core(using: "https://example.com/someSpec/v1.0")
        @core(using: "https://spec.example.io/another/v1.0", as: "renamed", export: true)
      { query: Query }

      type Query {
        field: Int @someSpec(message: "this should go away")
        another: String @renamed(message: "this stays")
      }

      enum someSpec__ExportedEnum @core(export: true) {
        A B
      }

      enum someSpec__SomeEnum {
        SOME_VALUE
      }`
      .map(exportSchema)
      .map(print).value;

    expect(exported).toMatchInlineSnapshot(`
      "schema {
        query: Query
      }

      type Query {
        field: Int
        another: String @renamed(message: \\"this stays\\")
      }

      enum someSpec__ExportedEnum {
        A
        B
      }
      "
    `);
  });
});

import { one, directive } from "../bind";
import { pathOf } from "../linkage";
import { Str } from "../metadata";
import Schema from "../schema";
import { spec } from "../spec";

describe("Layers", () => {
  it("bind implementations to specifications", () => {
    const schema = Schema.parse`
      schema
        @core(using: "https://lib.apollo.dev/core/v0.1")
        @core(using: "https://example.com/someSpec/v1.0")
      { query: Query }

      type Example {
        field: Int @someSpec(message: "hello")
        another: String @someSpec(message: "goodbye")
      }
    `;

    const someSpec = directive(spec`https://example.com/someSpec/v1.0`)({
      FieldAnnotation: one(
        {
          message: Str.must,
        },
        "FIELD_DEFINITION"
      ),
    });

    expect(someSpec((schema.document.definitions[1] as any).fields[0]))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "FieldAnnotation": Object {
            "message": "hello",
          },
          "is": "FieldAnnotation",
          "on": FieldDefinition <definitions/1/fields/0>,
        },
      ]
    `);

    expect(someSpec(schema.document)).toMatchInlineSnapshot(`
      Array [
        Object {
          "FieldAnnotation": Object {
            "message": "hello",
          },
          "is": "FieldAnnotation",
          "on": FieldDefinition <definitions/1/fields/0>,
        },
        Object {
          "FieldAnnotation": Object {
            "message": "goodbye",
          },
          "is": "FieldAnnotation",
          "on": FieldDefinition <definitions/1/fields/1>,
        },
      ]
    `);

    expect(schema.errors.length).toEqual(0);
  });
});

import { one, directive } from "../bind";
import { Int, Str, must, struct, list } from "../serde";
import { spec } from "../spec";
import { fromSource, errors } from "../schema";

describe("Layers", () => {
  it("bind implementations to specifications", () => {
    const schema = fromSource`
      schema
        @core(using: "https://lib.apollo.dev/core/v0.1")
        @core(using: "https://example.com/someSpec/v1.0")
      { query: Query }

      type Example {
        field: Int @someSpec(message: "hello")
        another: String @someSpec(message: "goodbye") @someSpec(value: 42, items: [0, 1, 2])
      }
    `.value;

    const someSpec = directive(spec`https://example.com/someSpec/v1.0`)({
      FieldAnnotation: one(
        {
          message: must(Str),
        },
        "FIELD_DEFINITION"
      ),
      NumAnnotation: one(
        {
          value: must(Int),
          items: must(list(must(Int))),
        },
        "FIELD_DEFINITION"
      ),
    });

    expect(someSpec((schema.definitions[1] as any).fields[0]))
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

    expect(someSpec(schema)).toMatchInlineSnapshot(`
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
        Object {
          "NumAnnotation": Object {
            "items": Array [
              0,
              1,
              2,
            ],
            "value": 42,
          },
          "is": "NumAnnotation",
          "on": FieldDefinition <definitions/1/fields/1>,
        },
      ]
    `);

    expect(errors(schema)).toEqual([]);
  });
});

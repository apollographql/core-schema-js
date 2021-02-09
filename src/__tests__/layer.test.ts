import { one, directive } from "../bind";
import { Str } from "../metadata";
import { spec } from "../spec";
import { fromSource, errors } from '../schema';

describe("Layers", () => {
  it("bind implementations to specifications", () => {
    const schema = fromSource `
      schema
        @core(using: "https://lib.apollo.dev/core/v0.1")
        @core(using: "https://example.com/someSpec/v1.0")
      { query: Query }

      type Example {
        field: Int @someSpec(message: "hello")
        another: String @someSpec(message: "goodbye")
      }
    `.value

    const someSpec = directive(spec`https://example.com/someSpec/v1.0`)({
      FieldAnnotation: one(
        {
          message: Str.must,
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
      ]
    `);

    expect(errors(schema)).toEqual([]);
  });
});

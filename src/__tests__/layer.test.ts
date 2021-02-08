import { one, layer } from "../layer";
import { Str } from "../metadata";
import Schema from "../schema";

describe("Layers", () => {
  it("bind implementations to specifications", () => {
    const schema = Schema.parse`
      schema
        @core(using: "https://lib.apollo.dev/core/v0.1")
        @core(using: "https://example.com/someSpec/v1.0")
      { query: Query }

      type Example {
        field: Int @someSpec(message: "hello")
      }
    `;

    const someSpec = layer`https://example.com/someSpec/v1.0`({
      Field: one(
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
          "Field": Object {
            "message": "hello",
          },
          "is": "Field",
        },
      ]
    `);
  });
});

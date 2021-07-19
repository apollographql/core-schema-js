import { directive } from "../bind";
import { scan } from "../scan";
import { Int, Str, must, list } from "../serde";
import { fromSource, errors } from "../schema";

describe("Layers", () => {
  it("bind implementations to specifications", () => {
    const doc = fromSource`
      schema
        @core(using: "https://lib.apollo.dev/core/v0.1")
        @core(using: "https://example.com/someSpec/v1.0")
      { query: Query }

      type Example {
        field: Int @someSpec(message: "hello")
        another: String @someSpec(message: "goodbye") @someSpec__value(value: 42, items: [0, 1, 2])
      }
    `.output();

    const someSpec = directive(
      "https://example.com/someSpec/v1.0",
      "someSpec",
      {
        message: must(Str),
      },
      "on",
      "FIELD_DEFINITION"
    );

    const someSpecValue = directive(
      "https://example.com/someSpec/v1.0",
      "someSpec__value",
      {
        value: must(Int),
        items: must(list(must(Int))),
      },
      "on",
      "FIELD_DEFINITION"
    );

    expect(scan((doc.definitions[1] as any).fields[0], someSpec))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "data": Object {
            "message": "hello",
          },
          "name": "someSpec",
          "node": FieldDefinition <182...220>,
          "spec": "https://example.com/someSpec/v1.0",
        },
      ]
    `);

    expect(scan((doc.definitions[1] as any).fields[1], someSpec))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "data": Object {
            "message": "goodbye",
          },
          "name": "someSpec",
          "node": FieldDefinition <229...320>,
          "spec": "https://example.com/someSpec/v1.0",
        },
      ]
    `);

    expect(scan((doc.definitions[1] as any).fields[1], someSpecValue))
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "data": Object {
            "items": Array [
              0,
              1,
              2,
            ],
            "value": 42,
          },
          "name": "someSpec__value",
          "node": FieldDefinition <229...320>,
          "spec": "https://example.com/someSpec/v1.0",
        },
      ]
    `);

    expect(errors(doc)).toEqual([]);
  });
});

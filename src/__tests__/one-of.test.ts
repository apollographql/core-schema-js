import { Str, must, struct, Bool, oneOf } from "../serde";
import { fromSource, schemaDef } from "../schema";

describe("oneOf", () => {
  it("deserializes one of a set of variants", () => {
    const schema = fromSource`
      schema
        @core(using: "https://lib.apollo.dev/core/v0.1")
        @core(export: true)
        @another(value: false)
      { query: Query }
    `.to(schemaDef).output();

    const de = oneOf({
      Using: struct({
        using: must(Str),
      }),
      Export: struct({
        export: must(Bool),
      }),
    });

    expect(de.deserialize(schema.directives[0])).toMatchInlineSnapshot(`
      Object {
        "is": "ok",
        "node": Directive <definitions/0/directives/0>,
        "ok": Object {
          "Using": Object {
            "using": "https://lib.apollo.dev/core/v0.1",
          },
          "is": "Using",
        },
      }
    `);

    expect(de.deserialize(schema.directives[1])).toMatchInlineSnapshot(`
      Object {
        "is": "ok",
        "node": Directive <definitions/0/directives/1>,
        "ok": Object {
          "Export": Object {
            "export": true,
          },
          "is": "Export",
        },
      }
    `);

    expect(de.deserialize(schema.directives[2]).toString())
      .toMatchInlineSnapshot(`
      "[NoMatch] <anonymous>:4:9: no forms matched
        - [ReadForm] <anonymous>:4:9: could not read form Using
            - [ReadStruct] <anonymous>:4:9: could not read struct
                - [ReadField] <anonymous>:[unknown]: could not read field \\"using\\"
                    - [NullNode] <anonymous>:[unknown]: expected non-null node, got undefined
        - [ReadForm] <anonymous>:4:9: could not read form Export
            - [ReadStruct] <anonymous>:4:9: could not read struct
                - [ReadField] <anonymous>:[unknown]: could not read field \\"export\\"
                    - [NullNode] <anonymous>:[unknown]: expected non-null node, got undefined"
    `);
  });
});

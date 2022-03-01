import recall from "@protoplasm/recall";
import { Kind, parse, Source } from "graphql";
import { deepRefs, fill } from "../de";
import HgRef from "../hgref";
import Schema from "../schema";

const base = Schema.from(
  parse(
    new Source(
      `
  extend schema
    @link(url: "https://specs.apollo.dev/link/v0.3")
    @link(url: "https://specs.apollo.dev/id/v1.0")  
    
  directive @link(url: link__Url!, as: link__Schema, import: link__Import)
    repeatable on SCHEMA
  directive @id(url: link__Url!, as: link__Schema) on SCHEMA
`,
      "builtins.graphql"
    )
  )
);

const schema = Schema.from(
  parse(`
  extend schema
    @id(url: "https://specs/me")
    @link(url: "https://specs.apollo.dev/federation/v2.0",
      import: "@requires @key @prov: @provides")
      
    type User @key(fields: "id") {
      id: ID!
    }
`),
  base
);

describe("fill", () => {
  it("fills definitions", () => {
    expect(fill(base, schema)).toMatchInlineSnapshot(`
      Array [
        <https://specs.apollo.dev/id/v1.0#@>[builtins.graphql] 👉directive @id(url: link__Url!, as: link__Schema) on SCHEMA,
        <https://specs.apollo.dev/link/v0.3#@>[builtins.graphql] 👉directive @link(url: link__Url!, as: link__Schema, import: link__Import),
      ]
    `);
  });

  it("reports errors", () => {
    const result = recall(() => fill(base, schema)).getResult();
    expect([...result.errors()].map((err) => err.toString()))
      .toMatchInlineSnapshot(`
      Array [
        "[NoDefinition] no definitions found for reference

      GraphQL request:7:15
      6 |       
      7 |     type User @key(fields: \\"id\\") {
        |               ^
      8 |       id: ID!",
        "[NoDefinition] no definitions found for reference

      GraphQL request:8:11
      7 |     type User @key(fields: \\"id\\") {
      8 |       id: ID!
        |           ^
      9 |     }",
        "[NoDefinition] no definitions found for reference

      builtins.graphql:8:22
      7 |     repeatable on SCHEMA
      8 |   directive @id(url: link__Url!, as: link__Schema) on SCHEMA
        |                      ^
      9 |

      builtins.graphql:6:24
      5 |     
      6 |   directive @link(url: link__Url!, as: link__Schema, import: link__Import)
        |                        ^
      7 |     repeatable on SCHEMA",
        "[NoDefinition] no definitions found for reference

      builtins.graphql:8:38
      7 |     repeatable on SCHEMA
      8 |   directive @id(url: link__Url!, as: link__Schema) on SCHEMA
        |                                      ^
      9 |

      builtins.graphql:6:40
      5 |     
      6 |   directive @link(url: link__Url!, as: link__Schema, import: link__Import)
        |                                        ^
      7 |     repeatable on SCHEMA",
        "[NoDefinition] no definitions found for reference

      builtins.graphql:6:62
      5 |     
      6 |   directive @link(url: link__Url!, as: link__Schema, import: link__Import)
        |                                                              ^
      7 |     repeatable on SCHEMA",
      ]
    `);
  });
});

describe("deepRefs", () => {
  it("finds deep references", () => {
    const schema = Schema.from(
      parse(`
      extend schema
        @link(url: "https://specs.apollo.dev/federation/v2.0",
          import: "@requires @key @prov: @provides")
        @link(url: "file:../common", import: "Filter")
          
      type User @key(fields: "id") @federation {
        favorites(filter: Filter): [Favorite] @requires(fields: "prefs")
      }
    `),
      base
    );
    const [User] = schema.definitions(HgRef.named("User"));
    expect(User.hgref).toBe(HgRef.named("User"));
    expect(User.kind).toBe(Kind.OBJECT_TYPE_DEFINITION);
    expect([...deepRefs(User)]).toMatchInlineSnapshot(`
      Array [
        <#User>[GraphQL request] 👉type User @key(fields: "id") @federation {,
        <https://specs.apollo.dev/federation/v2.0#@key>[GraphQL request] type User 👉@key(fields: "id") @federation {,
        <https://specs.apollo.dev/federation/v2.0#@>[GraphQL request] type User @key(fields: "id") 👉@federation {,
        <file:///common#Filter>[GraphQL request] favorites(filter: 👉Filter): [Favorite] @requires(fields: "prefs"),
        <#Favorite>[GraphQL request] favorites(filter: Filter): [👉Favorite] @requires(fields: "prefs"),
        <https://specs.apollo.dev/federation/v2.0#@requires>[GraphQL request] favorites(filter: Filter): [Favorite] 👉@requires(fields: "prefs"),
      ]
    `);
  });
});

import recall from "@protoplasm/recall";
import { Kind, parse, Source } from "graphql";
import { deepRefs, fill, refsInDefs } from "../de";
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
    expect(fill(schema, base)).toMatchInlineSnapshot(`
      Array [
        <https://specs.apollo.dev/id/v1.0#@>[builtins.graphql] 👉directive @id(url: link__Url!, as: link__Schema) on SCHEMA,
        <https://specs.apollo.dev/link/v0.3#@>[builtins.graphql] 👉directive @link(url: link__Url!, as: link__Schema, import: link__Import),
      ]
    `);
  });

  it("reports errors", () => {
    const result = recall(() => fill(schema, base)).getResult();
    expect(
      [...result.errors()]
        .map((e: any) => e.code)
        .reduce((x, y) => (x !== y ? [x, y] : x))
    ).toBe("NoDefinition");
    expect([...result.errors()].map((err: any) => err.nodes))
      .toMatchInlineSnapshot(`
      Array [
        Array [
          <https://specs.apollo.dev/federation/v2.0#@key>[GraphQL request] type User 👉@key(fields: "id") {,
        ],
        Array [
          <https://specs/me#ID>[GraphQL request] id: 👉ID!,
        ],
        Array [
          <https://specs.apollo.dev/link/v0.3#Url>[builtins.graphql] directive @id(url: 👉link__Url!, as: link__Schema) on SCHEMA,
          <https://specs.apollo.dev/link/v0.3#Url>[builtins.graphql] directive @link(url: 👉link__Url!, as: link__Schema, import: link__Import),
        ],
        Array [
          <https://specs.apollo.dev/link/v0.3#Schema>[builtins.graphql] directive @id(url: link__Url!, as: 👉link__Schema) on SCHEMA,
          <https://specs.apollo.dev/link/v0.3#Schema>[builtins.graphql] directive @link(url: link__Url!, as: 👉link__Schema, import: link__Import),
        ],
        Array [
          <https://specs.apollo.dev/link/v0.3#Import>[builtins.graphql] directive @link(url: link__Url!, as: link__Schema, import: 👉link__Import),
        ],
      ]
    `);
  });
});

describe("refsInDefs", () => {
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
    const User = schema.definitions(HgRef.named("User"));
    expect([...refsInDefs(User)]).toMatchInlineSnapshot(`
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

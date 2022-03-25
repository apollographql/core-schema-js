import { getResult } from "@protoplasm/recall";
import { parse, Source } from "graphql";
import { fill, refNodesIn } from "../de";
import GRef from "../gref";
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
  parse(
    new Source(
      `
  extend schema
    @id(url: "https://specs/me")
    @link(url: "https://specs.apollo.dev/federation/v2.0",
      import: "@requires @key @prov: @provides")
      
    type User @key(fields: "id") {
      id: ID!
    }
`,
      "example"
    )
  ),
  base
);

describe("fill", () => {
  it("fills definitions", () => {
    expect(fill(schema, base)).toMatchInlineSnapshot(`
      Iterable [
        <https://specs.apollo.dev/id/v1.0#@>[builtins.graphql] 👉directive @id(url: link__Url!, as: link__Schema) on SCHEMA,
        <https://specs.apollo.dev/link/v0.3#@>[builtins.graphql] 👉directive @link(url: link__Url!, as: link__Schema, import: link__Import),
      ]
    `);
  });

  it("reports errors", () => {
    const result = getResult(() => [...fill(schema, base)])
    expect(
      [...result.errors()]
        .map((e: any) => e.code)
        .reduce((x, y) => (x !== y ? [x, y] : x))
    ).toBe("NoDefinition");
    expect([...result.errors()].map((err: any) => err.nodes))
      .toMatchInlineSnapshot(`
      Array [
        Array [
          <https://specs.apollo.dev/federation/v2.0#@key>[example] type User 👉@key(fields: "id") {,
        ],
        Array [
          <https://specs/me#ID>[example] id: 👉ID!,
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
    const User = schema.definitions(GRef.named("User"));
    expect([...refNodesIn(User)]).toMatchInlineSnapshot(`
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

describe("a subgraph test", () => {
  it("works", () => {
    const schema = Schema.from(
      parse(`
      extend schema
        @link(url: "https://specs.apollo.dev/link/v0.3")
        @link(url: "https://specs.apollo.dev/federation/v1.0",
          import: "@key @requires @provides @external")
        @link(url: "https://specs.apollo.dev/id/v1.0")
      
      type Query {
        product: Product
      }
      
      type Product @key(fields: "upc") {
        upc: String!
        name: String
      }
      
      extend type Product {
        price: Int
      }
      
      directive @key(fields: federation__FieldSet!) repeatable on OBJECT
      
      scalar federation__FieldSet
    `)
    );
    expect([...refNodesIn(schema)]).toMatchInlineSnapshot(`
      Array [
        <>[GraphQL request] 👉extend schema,
        <https://specs.apollo.dev/link/v0.3#@>[GraphQL request] 👉@link(url: "https://specs.apollo.dev/link/v0.3"),
        <https://specs.apollo.dev/link/v0.3#@>[GraphQL request] 👉@link(url: "https://specs.apollo.dev/federation/v1.0",
        <https://specs.apollo.dev/link/v0.3#@>[GraphQL request] 👉@link(url: "https://specs.apollo.dev/id/v1.0"),
        <#Query>[GraphQL request] 👉type Query {,
        <#Product>[GraphQL request] product: 👉Product,
        <#Product>[GraphQL request] 👉type Product @key(fields: "upc") {,
        <https://specs.apollo.dev/federation/v1.0#@key>[GraphQL request] type Product 👉@key(fields: "upc") {,
        <#String>[GraphQL request] upc: 👉String!,
        <#String>[GraphQL request] name: 👉String,
        <#Product>[GraphQL request] 👉extend type Product {,
        <#Int>[GraphQL request] price: 👉Int,
        <https://specs.apollo.dev/federation/v1.0#@key>[GraphQL request] 👉directive @key(fields: federation__FieldSet!) repeatable on OBJECT,
        <https://specs.apollo.dev/federation/v1.0#FieldSet>[GraphQL request] directive @key(fields: 👉federation__FieldSet!) repeatable on OBJECT,
        <https://specs.apollo.dev/federation/v1.0#FieldSet>[GraphQL request] 👉scalar federation__FieldSet,
      ]
    `);

    const LINK = Schema.from(
      parse(
        new Source(
          `
    extend schema @id(url: "https://specs.apollo.dev/link/v0.3")
  
    directive @link(url: Url!, as: Name, import: Imports)
      repeatable on SCHEMA
  
    scalar Url
    scalar Name
    scalar Imports
    `,
          "builtin/link/v0.3.graphql"
        )
      ),
      base
    );

    expect([...fill(schema, LINK)]).toMatchInlineSnapshot(`
      Array [
        <https://specs.apollo.dev/link/v0.3#@>[builtin/link/v0.3.graphql] 👉directive @link(url: Url!, as: Name, import: Imports),
        <https://specs.apollo.dev/link/v0.3#Url>[builtin/link/v0.3.graphql] 👉scalar Url,
        <https://specs.apollo.dev/link/v0.3#Name>[builtin/link/v0.3.graphql] 👉scalar Name,
        <https://specs.apollo.dev/link/v0.3#Imports>[builtin/link/v0.3.graphql] 👉scalar Imports,
      ]
    `);

    expect(
      [
        ...getResult(() => [...fill(schema, LINK)])
          .errors(),
      ].map((x) => (x as any).nodes)
    ).toMatchInlineSnapshot(`
      Array [
        Array [
          <#String>[GraphQL request] upc: 👉String!,
          <#String>[GraphQL request] name: 👉String,
        ],
        Array [
          <#Int>[GraphQL request] price: 👉Int,
        ],
      ]
    `);
  });
});

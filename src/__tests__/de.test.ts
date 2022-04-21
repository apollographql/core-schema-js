import { getResult } from "@protoplasm/recall";
import { parse, Source } from "graphql";
import { fill, refNodesIn } from "../de";
import gql from "../gql";
import GRef from "../gref";
import Schema from "../schema";
import raw from "../snapshot-serializers/raw";

const base = Schema.from(
  parse(
    new Source(
      `
  extend schema
    @link(url: "https://specs.apollo.dev/link/v1.0")
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

    directive @key(fields: String) on OBJECT
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
        <https://specs.apollo.dev/link/v1.0#@>[builtins.graphql] 👉directive @link(url: link__Url!, as: link__Schema, import: link__Import),
      ]
    `);
  });

  it("reports errors", () => {
    const result = getResult(() => [...fill(schema, base)]);
    expect([...result.errors()].map((err: any) => [err.code, err.nodes]))
      .toMatchInlineSnapshot(`
      Array [
        Array [
          "NoDefinition",
          Array [
            Object {
              "gref": GRef <https://specs.apollo.dev/federation/v2.0#@requires>,
              "message": "no definitions found for reference: https://specs.apollo.dev/federation/v2.0#@requires",
              "nodes": Array [
                [example] 👉@link(url: "https://specs.apollo.dev/federation/v2.0",
              ],
            },
          ],
        ],
        Array [
          "NoDefinition",
          Array [
            Object {
              "gref": GRef <https://specs.apollo.dev/federation/v2.0#@provides>,
              "message": "no definitions found for reference: https://specs.apollo.dev/federation/v2.0#@provides",
              "nodes": Array [
                [example] 👉@link(url: "https://specs.apollo.dev/federation/v2.0",
              ],
            },
          ],
        ],
        Array [
          "NoDefinition",
          Array [
            Object {
              "gref": GRef <https://specs/me#ID>,
              "message": "no definitions found for reference: https://specs/me#ID",
              "nodes": Array [
                <https://specs/me#ID>[example] id: 👉ID!,
              ],
            },
          ],
        ],
        Array [
          "NoDefinition",
          Array [
            Object {
              "gref": GRef <https://specs/me#String>,
              "message": "no definitions found for reference: https://specs/me#String",
              "nodes": Array [
                <https://specs/me#String>[example] directive @key(fields: 👉String) on OBJECT,
              ],
            },
          ],
        ],
        Array [
          "NoDefinition",
          Array [
            Object {
              "gref": GRef <https://specs.apollo.dev/link/v1.0#Url>,
              "message": "no definitions found for reference: https://specs.apollo.dev/link/v1.0#Url",
              "nodes": Array [
                <https://specs.apollo.dev/link/v1.0#Url>[builtins.graphql] directive @id(url: 👉link__Url!, as: link__Schema) on SCHEMA,
                <https://specs.apollo.dev/link/v1.0#Url>[builtins.graphql] directive @link(url: 👉link__Url!, as: link__Schema, import: link__Import),
              ],
            },
          ],
        ],
        Array [
          "NoDefinition",
          Array [
            Object {
              "gref": GRef <https://specs.apollo.dev/link/v1.0#Schema>,
              "message": "no definitions found for reference: https://specs.apollo.dev/link/v1.0#Schema",
              "nodes": Array [
                <https://specs.apollo.dev/link/v1.0#Schema>[builtins.graphql] directive @id(url: link__Url!, as: 👉link__Schema) on SCHEMA,
                <https://specs.apollo.dev/link/v1.0#Schema>[builtins.graphql] directive @link(url: link__Url!, as: 👉link__Schema, import: link__Import),
              ],
            },
          ],
        ],
        Array [
          "NoDefinition",
          Array [
            Object {
              "gref": GRef <https://specs.apollo.dev/link/v1.0#Import>,
              "message": "no definitions found for reference: https://specs.apollo.dev/link/v1.0#Import",
              "nodes": Array [
                <https://specs.apollo.dev/link/v1.0#Import>[builtins.graphql] directive @link(url: link__Url!, as: link__Schema, import: 👉link__Import),
              ],
            },
          ],
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
    const schema = Schema.basic(gql`${"subgraph-test.graphql"}
      extend schema
        @link(url: "https://specs.apollo.dev/link/v1.0")
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
    `);
    expect([...refNodesIn(schema)]).toMatchInlineSnapshot(`
      Array [
        GRef <#@key> => GRef <https://specs.apollo.dev/federation/v1.0#@key> (via [subgraph-test.graphql] 👉@link(url: "https://specs.apollo.dev/federation/v1.0"),
        GRef <#@requires> => GRef <https://specs.apollo.dev/federation/v1.0#@requires> (via [subgraph-test.graphql] 👉@link(url: "https://specs.apollo.dev/federation/v1.0"),
        GRef <#@provides> => GRef <https://specs.apollo.dev/federation/v1.0#@provides> (via [subgraph-test.graphql] 👉@link(url: "https://specs.apollo.dev/federation/v1.0"),
        GRef <#@external> => GRef <https://specs.apollo.dev/federation/v1.0#@external> (via [subgraph-test.graphql] 👉@link(url: "https://specs.apollo.dev/federation/v1.0"),
        <>[subgraph-test.graphql] 👉extend schema,
        <https://specs.apollo.dev/link/v1.0#@>[subgraph-test.graphql] 👉@link(url: "https://specs.apollo.dev/link/v1.0"),
        <https://specs.apollo.dev/link/v1.0#@>[subgraph-test.graphql] 👉@link(url: "https://specs.apollo.dev/federation/v1.0",
        <https://specs.apollo.dev/link/v1.0#@>[subgraph-test.graphql] 👉@link(url: "https://specs.apollo.dev/id/v1.0"),
        <#Query>[subgraph-test.graphql] 👉type Query {,
        <#Product>[subgraph-test.graphql] product: 👉Product,
        <#Product>[subgraph-test.graphql] 👉type Product @key(fields: "upc") {,
        <https://specs.apollo.dev/federation/v1.0#@key>[subgraph-test.graphql] type Product 👉@key(fields: "upc") {,
        <https://specs.graphql.org/#String>[subgraph-test.graphql] upc: 👉String!,
        <https://specs.graphql.org/#String>[subgraph-test.graphql] name: 👉String,
        <#Product>[subgraph-test.graphql] 👉extend type Product {,
        <https://specs.graphql.org/#Int>[subgraph-test.graphql] price: 👉Int,
        <https://specs.apollo.dev/federation/v1.0#@key>[subgraph-test.graphql] 👉directive @key(fields: federation__FieldSet!) repeatable on OBJECT,
        <https://specs.apollo.dev/federation/v1.0#FieldSet>[subgraph-test.graphql] directive @key(fields: 👉federation__FieldSet!) repeatable on OBJECT,
        <https://specs.apollo.dev/federation/v1.0#FieldSet>[subgraph-test.graphql] 👉scalar federation__FieldSet,
      ]
    `);

    const LINK = Schema.basic(gql`${"builtin/link/v1.0.graphql"}
      @id(url: "https://specs.apollo.dev/link/v1.0")
    
      directive @link(url: Url!, as: Name, import: Imports)
        repeatable on SCHEMA
    
      scalar Url
      scalar Name
      scalar Imports
    `);

    expect([...fill(schema, LINK)]).toMatchInlineSnapshot(`
      Array [
        <https://specs.apollo.dev/link/v1.0#@>[builtin/link/v1.0.graphql] 👉directive @link(url: Url!, as: Name, import: Imports),
        <https://specs.apollo.dev/link/v1.0#Url>[builtin/link/v1.0.graphql] 👉scalar Url,
        <https://specs.apollo.dev/link/v1.0#Name>[builtin/link/v1.0.graphql] 👉scalar Name,
        <https://specs.apollo.dev/link/v1.0#Imports>[builtin/link/v1.0.graphql] 👉scalar Imports,
      ]
    `);

    expect(
      [...getResult(() => [...fill(schema, LINK)]).errors()].map((x) =>
        raw(x.toString())
      )
    ).toMatchInlineSnapshot(`
      Array [
        [NoDefinition] no definitions found for reference: https://specs.apollo.dev/federation/v1.0#@requires,
        [NoDefinition] no definitions found for reference: https://specs.apollo.dev/federation/v1.0#@provides,
        [NoDefinition] no definitions found for reference: https://specs.apollo.dev/federation/v1.0#@external,
      ]
    `);
  });
});

import { Kind, parse, Source, print } from "graphql";
import { Locatable } from "../de";
import gql from "../gql";
import { GRef } from "../gref";
import LinkUrl from "../link-url";
import Schema from "../schema";
import { Atlas } from "../atlas";
import raw from "../snapshot-serializers/raw";
import recall from "@protoplasm/recall";

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

describe("Schema", () => {
  it("a basic schema", () => {
    const schema = Schema.basic(gql`${"example.graphql"}
      @link(url: "https://specs.apollo.dev/federation/v1.0")
      @link(url: "https://specs.apollo.dev/inaccessible/v0.1")
    
      type User @inaccessible {
        id: ID!
      }
    `);

    expect(schema).toMatchInlineSnapshot(`
      Schema [
        <>[example.graphql] 👉@link(url: "https://specs.apollo.dev/federation/v1.0"),
        <#User>[example.graphql] 👉type User @inaccessible {,
      ]
    `);

    expect(schema.scope).toMatchInlineSnapshot(`
      Scope [
        Object {
          "gref": GRef <https://specs.apollo.dev/federation/v1.0>,
          "linker": [builtin:schema/basic] 👉@link(url: "https://specs.apollo.dev/link/v0.3"),
          "name": "federation",
          "via": [example.graphql] 👉@link(url: "https://specs.apollo.dev/federation/v1.0"),
        },
        Object {
          "gref": GRef <https://specs.apollo.dev/federation/v1.0#@>,
          "linker": [builtin:schema/basic] 👉@link(url: "https://specs.apollo.dev/link/v0.3"),
          "name": "@federation",
          "via": [example.graphql] 👉@link(url: "https://specs.apollo.dev/federation/v1.0"),
        },
        Object {
          "gref": GRef <https://specs.apollo.dev/inaccessible/v0.1>,
          "linker": [builtin:schema/basic] 👉@link(url: "https://specs.apollo.dev/link/v0.3"),
          "name": "inaccessible",
          "via": [example.graphql] 👉@link(url: "https://specs.apollo.dev/inaccessible/v0.1"),
        },
        Object {
          "gref": GRef <https://specs.apollo.dev/inaccessible/v0.1#@>,
          "linker": [builtin:schema/basic] 👉@link(url: "https://specs.apollo.dev/link/v0.3"),
          "name": "@inaccessible",
          "via": [example.graphql] 👉@link(url: "https://specs.apollo.dev/inaccessible/v0.1"),
        },
      ]
    `);

    expect(schema.refs).toMatchInlineSnapshot(`
      Object [
        <>[example.graphql] 👉@link(url: "https://specs.apollo.dev/federation/v1.0"),
        <https://specs.apollo.dev/link/v0.3#@>[example.graphql] 👉@link(url: "https://specs.apollo.dev/federation/v1.0"),
        <https://specs.apollo.dev/link/v0.3#@>[example.graphql] 👉@link(url: "https://specs.apollo.dev/inaccessible/v0.1"),
        <#User>[example.graphql] 👉type User @inaccessible {,
        <https://specs.apollo.dev/inaccessible/v0.1#@>[example.graphql] type User 👉@inaccessible {,
        <#ID>[example.graphql] id: 👉ID!,
      ]
    `);
  });

  it("can be created from a doc", () => {
    const schema = Schema.from(
      parse(
        new Source(
          `extend schema
      @id(url: "https://my.org/mySchema")
      @link(url: "https://specs.apollo.dev/link/v0.3")
      @link(url: "https://specs.apollo.dev/id/v1.0")
      @link(url: "https://example.com/foo")
      @link(url: "https://specs.company.org/someSpec/v1.2", as: spec)
    `,
          "example.graphql"
        )
      )
    );
    expect(schema.url).toBe(LinkUrl.from("https://my.org/mySchema"));
    expect(schema.scope.own("link")?.gref).toBe(
      GRef.schema("https://specs.apollo.dev/link/v0.3")
    );
    expect(schema.scope.own("spec")?.gref).toBe(
      GRef.schema("https://specs.company.org/someSpec/v1.2")
    );
    expect(schema.scope.own("@foo")?.gref).toBe(
      GRef.rootDirective("https://example.com/foo")
    );
    expect(schema.locate(ref("@spec__dir"))).toBe(
      GRef.directive("dir", "https://specs.company.org/someSpec/v1.2")
    );
  });

  it("locates nodes", () => {
    const schema = Schema.from(
      parse(`
      extend schema
        @link(url: "https://specs.apollo.dev/federation/v2.0",
          import: "@requires @key @prov: @provides")      
    `),
      base.scope
    );

    // note: .toBe checks are intentional, equal grefs
    // are meant to be identical (the same object) via
    // caching. this allows them to be treated as
    // values (e.g. used as keys in maps)
    expect(schema.locate(ref("@requires"))).toBe(
      GRef.directive("requires", "https://specs.apollo.dev/federation/v2.0")
    );
    expect(schema.locate(ref("@provides"))).toBe(GRef.directive("provides"));
    expect(schema.locate(ref("@federation"))).toBe(
      GRef.directive("", "https://specs.apollo.dev/federation/v2.0")
    );
    expect(schema.locate(ref("@prov"))).toBe(
      GRef.directive("provides", "https://specs.apollo.dev/federation/v2.0")
    );
    expect(schema.locate(ref("link__Schema"))).toBe(
      GRef.named("Schema", "https://specs.apollo.dev/link/v0.3")
    );

    // all nodes have locations
    expect(schema.locate(ref("link__Schema"))).toBe(
      GRef.named("Schema", "https://specs.apollo.dev/link/v0.3")
    );
  });

  it("understands @id", () => {
    const schema = Schema.basic(gql`${"schema with id"}
      @id(url: "https://specs/me")
      @link(url: "https://specs.apollo.dev/federation/v2.0",
        import: "@requires @key @prov: @provides")
      directive @me repeatable on SCHEMA
      scalar Something @key   
    `);
    expect(schema.url).toBe(LinkUrl.from("https://specs/me"));
    expect(schema.locate(ref("@id"))).toBe(
      GRef.rootDirective("https://specs.apollo.dev/id/v1.0")
    );
    expect(schema.locate(ref("@requires"))).toBe(
      GRef.directive("requires", "https://specs.apollo.dev/federation/v2.0")
    );
    expect(schema.locate(ref("SomeLocalType"))).toBe(
      GRef.named("SomeLocalType", "https://specs/me")
    );
    expect(schema.locate(ref("@myDirective"))).toBe(
      GRef.directive("myDirective", "https://specs/me")
    );
    expect(schema).toMatchInlineSnapshot(`
      Schema [
        <https://specs/me>[schema with id] 👉@id(url: "https://specs/me"),
        <https://specs/me#@>[schema with id] 👉directive @me repeatable on SCHEMA,
        <https://specs/me#Something>[schema with id] 👉scalar Something @key,
      ]
    `);

    // a self-link is added when the url has a name
    expect(schema.scope.own("")?.gref).toBe(GRef.schema("https://specs/me"));

    // directive terms with the same name as the current schema
    // are mapped to the root directive.
    expect(schema.locate(ref("@me"))).toBe(
      GRef.rootDirective("https://specs/me")
    );
  });

  it("gets definitions for nodes", () => {
    const schema = Schema.basic(gql`${"my-schema"}
      @id(url: "https://specs/me")
      @link(url: "https://specs.apollo.dev/federation/v2.0",
            import: "@requires @key @provides (as @prov)")
        
      type User @key(fields: "id") {
        id: ID!
      }
    `);

    const user = schema.locate(ref("User"));
    expect(schema.definitions(user)).toMatchInlineSnapshot(`
      Array [
        <https://specs/me#User>[my-schema] 👉type User @key(fields: "id") {,
      ]
    `);

    expect(schema.definitions(schema.locate(ref("@link")))).toEqual([]);
    const link = schema.locate(ref("@link"));
    expect(link).toBe(
      GRef.rootDirective("https://specs.apollo.dev/link/v0.3")
    );
  });

  it("compiles", () => {
    const builtins = Schema.basic(gql`${"builtins"}
      @link(url: "https://specs.apollo.dev/federation/v1.0", import: "@key")
    `);
    const atlas = Atlas.fromSchemas(
      Schema.basic(gql`${"link spec"}
        @id(url: "https://specs.apollo.dev/link/v0.3")
        
        directive @link(url: Url!, as: Name, import: Imports)
          repeatable on SCHEMA
        scalar Url
        scalar Name
        scalar Imports
      `),
      Schema.basic(gql`${"fed spec"}
        @id(url: "https://specs.apollo.dev/federation/v1.0")

        directive @key(fields: FieldSet!) on OBJECT
        scalar FieldSet
      `)
    );

    expect(atlas).toMatchInlineSnapshot(`
      Atlas [
        <https://specs.apollo.dev/link/v0.3>[link spec] 👉@id(url: "https://specs.apollo.dev/link/v0.3"),
        <https://specs.apollo.dev/link/v0.3#@>[link spec] 👉directive @link(url: Url!, as: Name, import: Imports),
        <https://specs.apollo.dev/link/v0.3#Url>[link spec] 👉scalar Url,
        <https://specs.apollo.dev/link/v0.3#Name>[link spec] 👉scalar Name,
        <https://specs.apollo.dev/link/v0.3#Imports>[link spec] 👉scalar Imports,
        <https://specs.apollo.dev/federation/v1.0>[fed spec] 👉@id(url: "https://specs.apollo.dev/federation/v1.0"),
        <https://specs.apollo.dev/federation/v1.0#@key>[fed spec] 👉directive @key(fields: FieldSet!) on OBJECT,
        <https://specs.apollo.dev/federation/v1.0#FieldSet>[fed spec] 👉scalar FieldSet,
      ]
    `);

    const subgraph = Schema.from(
      gql`
        ${"subgraph"}
        type User @key(fields: "x y z") {
          id: ID!
        }
      `,
      builtins
    );

    const result = recall(() => subgraph.compile(atlas)).getResult();
    expect([...result.errors()].map((e: any) => [e, e.nodes]))
      .toMatchInlineSnapshot(`
      Array [
        Array [
          [NoDefinition: no definitions found for reference],
          Array [
            <#ID>[subgraph] id: 👉ID!,
          ],
        ],
      ]
    `);
    if (!result.didReturn()) throw result.error;
    const compiled = result.data;
    expect([...compiled]).toMatchInlineSnapshot(`
      Array [
        <>[+] extend schema @link(url: "https://specs.apollo.dev/link/v0.3") @link(url: "https://specs.apollo.dev/federation/v1.0", import: "@key") @link(url: "https://specs.apollo.dev/id/v1.0"),
        <#User>[subgraph] 👉type User @key(fields: "x y z") {,
        <https://specs.apollo.dev/link/v0.3#@>[link spec] 👉directive @link(url: Url!, as: Name, import: Imports),
        <https://specs.apollo.dev/federation/v1.0#@key>[fed spec] 👉directive @key(fields: FieldSet!) on OBJECT,
        <https://specs.apollo.dev/link/v0.3#Url>[link spec] 👉scalar Url,
        <https://specs.apollo.dev/link/v0.3#Name>[link spec] 👉scalar Name,
        <https://specs.apollo.dev/link/v0.3#Imports>[link spec] 👉scalar Imports,
        <https://specs.apollo.dev/federation/v1.0#FieldSet>[fed spec] 👉scalar FieldSet,
      ]
    `);

    expect(raw(print(compiled.document))).toMatchInlineSnapshot(`
      extend schema @link(url: "https://specs.apollo.dev/link/v0.3") @link(url: "https://specs.apollo.dev/federation/v1.0", import: "@key") @link(url: "https://specs.apollo.dev/id/v1.0")

      type User @key(fields: "x y z") {
        id: ID!
      }

      directive @link(url: link__Url!, as: link__Name, import: link__Imports) repeatable on SCHEMA

      directive @key(fields: federation__FieldSet!) on OBJECT

      scalar link__Url

      scalar link__Name

      scalar link__Imports

      scalar federation__FieldSet
    `);
  });

  it("returns standardized versions", () => {
    const subgraph = Schema.basic(gql`${"subgraph"}
      @link(url: "https://specs.apollo.dev/federation/v2.0",
            import: """
              @fkey: @key
              @frequires: @requires
              @fprovides: @provides
              @ftag: @tag
            """)

      type User @fkey(fields: "id") {
        id: ID! @ftag(name: "hi") @tag(name: "my tag")
      }

      directive @tag(name: string) on FIELD_DEFINITION
    `);

    expect(
      raw(
        subgraph.standardize("https://specs.apollo.dev/federation/v2.0").print()
      )
    ).toMatchInlineSnapshot(`
      extend schema @link(url: "https://specs.apollo.dev/link/v0.3") @link(url: "https://specs.apollo.dev/id/v1.0") @link(url: "https://specs.apollo.dev/federation/v2.0")

      type User @federation__key(fields: "id") {
        id: ID! @federation__tag(name: "hi") @tag(name: "my tag")
      }

      directive @tag(name: string) on FIELD_DEFINITION
    `);
  });
});

function ref(name: string): Locatable {
  if (name.startsWith("@"))
    return {
      kind: Kind.DIRECTIVE,
      name: { kind: Kind.NAME, value: name.slice(1) },
    };
  return {
    kind: Kind.NAMED_TYPE,
    name: { kind: Kind.NAME, value: name },
  };
}

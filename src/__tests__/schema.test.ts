import { DirectiveDefinitionNode, Kind, parse, Source } from "graphql";
import { directive, named } from "../hgref";
import LinkUrl from "../location";
import Schema, { Locatable } from "../schema";

describe("Schema", () => {
  it("can be created from a doc", () => {
    const schema = Schema.fromDoc(
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
    expect(schema.links).toMatchInlineSnapshot(`
      Scope {
        "entries": Map {
          "link" => Object {
            "location": Object {
              "graph": LinkUrl {
                "href": "https://specs.apollo.dev/link/v0.3",
                "name": "link",
                "type": "schema",
                "version": Version {
                  "major": 0,
                  "minor": 3,
                },
              },
              "name": undefined,
              "refKind": "schema",
            },
            "name": "link",
            "via": [example.graphql:3:7] @link(url: "https://specs.apollo.dev/link/v0.3"),
          },
          "id" => Object {
            "location": Object {
              "graph": LinkUrl {
                "href": "https://specs.apollo.dev/id/v1.0",
                "name": "id",
                "type": "schema",
                "version": Version {
                  "major": 1,
                  "minor": 0,
                },
              },
              "name": undefined,
              "refKind": "schema",
            },
            "name": "id",
            "via": [example.graphql:4:7] @link(url: "https://specs.apollo.dev/id/v1.0"),
          },
          "foo" => Object {
            "location": Object {
              "graph": LinkUrl {
                "href": "https://example.com/foo",
                "name": "foo",
                "type": "schema",
                "version": undefined,
              },
              "name": undefined,
              "refKind": "schema",
            },
            "name": "foo",
            "via": [example.graphql:5:7] @link(url: "https://example.com/foo"),
          },
          "spec" => Object {
            "location": Object {
              "graph": LinkUrl {
                "href": "https://specs.company.org/someSpec/v1.2",
                "name": "someSpec",
                "type": "schema",
                "version": Version {
                  "major": 1,
                  "minor": 2,
                },
              },
              "name": undefined,
              "refKind": "schema",
            },
            "name": "spec",
            "via": [example.graphql:6:7] @link(url: "https://specs.company.org/someSpec/v1.2", as: spec),
          },
          undefined => Object {
            "location": Object {
              "graph": LinkUrl {
                "href": "https://my.org/mySchema",
                "name": "mySchema",
                "type": "schema",
                "version": undefined,
              },
              "name": undefined,
              "refKind": "schema",
            },
            "name": "mySchema",
            "self": true,
            "via": [example.graphql:2:7] @id(url: "https://my.org/mySchema"),
          },
          "mySchema" => Object {
            "location": Object {
              "graph": LinkUrl {
                "href": "https://my.org/mySchema",
                "name": "mySchema",
                "type": "schema",
                "version": undefined,
              },
              "name": undefined,
              "refKind": "schema",
            },
            "name": "mySchema",
            "self": true,
            "via": [example.graphql:2:7] @id(url: "https://my.org/mySchema"),
          },
        },
        "parent": Scope {
          "entries": Map {},
          "parent": undefined,
        },
      }
    `);
  });

  const base = Schema.fromDoc(
    parse(
      new Source(
        `
    extend schema
      @link(url: "https://specs.apollo.dev/link/v0.3")
      @link(url: "https://specs.apollo.dev/id/v1.0")  
      
    directive @link(url: link__Url!, as: link__Schema, import: link__Import)
      repeatable on SCHEMA
  `,
        "builtins.graphql"
      )
    )
  );

  it("locates nodes", () => {
    const schema = Schema.fromDoc(
      parse(`
      extend schema
        @link(url: "https://specs.apollo.dev/federation/v2.0",
          import: "@requires @key @prov: @provides")      
    `),
      base
    );

    // note: .toBe checks are intentional, equal hgrefs
    // are meant to be identical (the same object) via
    // caching. this allows them to be treated as
    // values (e.g. used as keys in maps)
    expect(schema.locate(ref("@requires"))).toBe(
      directive("requires", "https://specs.apollo.dev/federation/v2.0")
    );
    expect(schema.locate(ref("@provides"))).toBe(directive("provides"));
    expect(schema.locate(ref("@federation"))).toBe(
      directive("", "https://specs.apollo.dev/federation/v2.0")
    );
    expect(schema.locate(ref("@prov"))).toBe(
      directive("provides", "https://specs.apollo.dev/federation/v2.0")
    );
    expect(schema.locate(ref("link__Schema"))).toBe(
      named("Schema", "https://specs.apollo.dev/link/v0.3")
    );

    // all nodes have locations
    expect(schema.locate(ref("link__Schema"))).toBe(
      named("Schema", "https://specs.apollo.dev/link/v0.3")
    );
  });

  it("understands @id", () => {
    const schema = Schema.fromDoc(
      parse(`
      extend schema
        @id(url: "https://specs/me")
        @link(url: "https://specs.apollo.dev/federation/v2.0",
          import: "@requires @key @prov: @provides")      
    `),
      base
    );
    expect(schema.url).toBe(LinkUrl.from("https://specs/me"));
    expect(schema.locate(ref("@requires"))).toBe(
      directive("requires", "https://specs.apollo.dev/federation/v2.0")
    );
    expect(schema.locate(ref("SomeLocalType"))).toBe(
      named("SomeLocalType", "https://specs/me")
    );
    expect(schema.locate(ref("@myDirective"))).toBe(
      directive("myDirective", "https://specs/me")
    );

    // a self-link is added when the url has a name
    expect(schema.links.own("me")).toBeTruthy();

    // this is helpful for defining the root directive
    expect(schema.locate(ref("@me"))).toBe(directive("", "https://specs/me"));

    // this works, but you probably don't want to do it
    expect(schema.locate(ref("me__ActuallyLocal"))).toBe(
      named("ActuallyLocal", "https://specs/me")
    );
  });

  it("gets definitions for nodes", () => {
    const schema = Schema.fromDoc(
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

    const user = schema.locate(ref("User"));
    expect(schema.definitions(user)).toMatchInlineSnapshot(`
      Array [
        [GraphQL request:7:9] type User @key(fields: "id") {,
      ]
    `);

    expect(schema.definitions(schema.locate(ref("@link")))).toEqual([]);
    const link = schema.locate(ref("@link"));
    expect(link).toBe(directive("", "https://specs.apollo.dev/link/v0.3"));
    expect([...schema.lookupDefinitions(schema.locate(ref("@link")))])
      .toMatchInlineSnapshot(`
      Array [
        [builtins.graphql:6:5] directive @link(url: link__Url!, as: link__Schema, import: link__Import),
      ]
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

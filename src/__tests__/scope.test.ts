import { Kind, parse } from "graphql";
import { directive, LinkUrl, type } from "../location";
import Scope, { fromDoc, ReferenceNode } from "../scope";

describe("scopes", () => {
  it("map of links to other schemas", () => {
    const scope = Scope.create(
      fromDoc(
        parse(`extend schema
      @link(url: "https://specs.apollo.dev/link/v0.3")
      @link(url: "https://example.com/foo")
      @link(url: "https://specs.company.org/someSpec/v1.2", as: spec)
    `)
      )
    );
    expect([...scope.links()]).toMatchInlineSnapshot(`
      Array [
        Object {
          "location": LinkUrl {
            "href": "https://specs.apollo.dev/link/v0.3",
            "name": "link",
            "type": "schema",
            "version": Version {
              "major": 0,
              "minor": 3,
            },
          },
          "name": "link",
          "via": GraphQL request:2:7
      1 | extend schema
      2 |       @link(url: "https://specs.apollo.dev/link/v0.3")
        |       ^
      3 |       @link(url: "https://example.com/foo"),
        },
        Object {
          "location": LinkUrl {
            "href": "https://example.com/foo",
            "name": "foo",
            "type": "schema",
            "version": undefined,
          },
          "name": "foo",
          "via": GraphQL request:3:7
      2 |       @link(url: "https://specs.apollo.dev/link/v0.3")
      3 |       @link(url: "https://example.com/foo")
        |       ^
      4 |       @link(url: "https://specs.company.org/someSpec/v1.2", as: spec),
        },
        Object {
          "location": LinkUrl {
            "href": "https://specs.company.org/someSpec/v1.2",
            "name": "someSpec",
            "type": "schema",
            "version": Version {
              "major": 1,
              "minor": 2,
            },
          },
          "name": "spec",
          "via": GraphQL request:4:7
      3 |       @link(url: "https://example.com/foo")
      4 |       @link(url: "https://specs.company.org/someSpec/v1.2", as: spec)
        |       ^
      5 |     ,
        },
      ]
    `);
  });

  it("inherits from a parent scope", () => {
    const base = Scope.create(
      fromDoc(
        parse(`
      extend schema
      @link(url: "https://specs.apollo.dev/link/v0.3")
      @core(feature: "https://specs.apollo.dev/core/v0.2")
    `)
      )
    );

    const child = base.child(
      fromDoc(
        parse(`
      extend schema
      @link(url: "https://example.com/foo")
      @link(url: "https://specs.company.org/someSpec/v1.2", as: spec)
      @core(feature: "https://somewhere.com/anotherSpec")
    `)
      )
    );

    expect(child.location(reference("@spec"))).toBe(
      directive("", "https://specs.company.org/someSpec/v1.2")
    );
    expect(child.location(reference("@core"))).toBe(
      directive("", "https://specs.apollo.dev/core/v0.2")
    );
    expect(child.location(reference("@link"))).toBe(
      directive("", "https://specs.apollo.dev/link/v0.3")
    );
  });

  it("retains a document reference", () => {
    const doc = parse(`
      extend schema
      @link(url: "https://specs.apollo.dev/link/v0.3")
      @link(url: "https://specs.apollo.dev/federation/v2.0")
    `);
    const scope = Scope.create(fromDoc(doc));
    expect(scope.root).toBe(doc);
  });

  it("can lookup names", () => {
    const doc = parse(`
      extend schema
      @link(url: "https://specs.apollo.dev/link/v0.3")
      @link(url: "https://specs.apollo.dev/federation/v2.0")
    `);
    const scope = Scope.create(fromDoc(doc));

    expect([...scope.locations(reference("@federation"))])
      .toMatchInlineSnapshot(`
      Array [
        Object {
          "graph": LinkUrl {
            "href": "https://specs.apollo.dev/federation/v2.0",
            "name": "federation",
            "type": "schema",
            "version": Version {
              "major": 2,
              "minor": 0,
            },
          },
          "name": "",
          "type": "directive",
        },
      ]
    `);

    const loc = scope.location(reference("@federation__requires"))!;
    expect(loc).toEqual(
      directive(
        "requires",
        LinkUrl.parse("https://specs.apollo.dev/federation/v2.0")
      )
    );

    expect(scope.location(reference("federation"))).toEqual(type("federation"));

    const unlinked = scope.location(reference("zonk"))!;
    expect(unlinked).toEqual(type("zonk"));
  });

  it("imports names locally", () => {
    const doc = parse(`
      extend schema
      @link(url: "https://specs.apollo.dev/link/v0.3")
      @link(url: "https://specs.apollo.dev/federation/v2.0",
            import: "@requires @prov: @provides SomeType")
    `);
    expect(LinkUrl.parse("https://specs.apollo.dev/federation/v2.0")).toEqual(
      LinkUrl.parse("https://specs.apollo.dev/federation/v2.0")
    );
    const scope = Scope.create(fromDoc(doc));
    const requires = scope.location(reference("@requires"));
    expect(requires).toEqual(
      LinkUrl.parse("https://specs.apollo.dev/federation/v2.0").locateDirective(
        "requires"
      )
    );

    expect(scope.location(reference("SomeType"))).toEqual(
      LinkUrl.parse("https://specs.apollo.dev/federation/v2.0").locateType(
        "SomeType"
      )
    );

    const prov = scope.location(reference("@prov"));
    expect(prov).toEqual(
      LinkUrl.parse("https://specs.apollo.dev/federation/v2.0").locateDirective(
        "provides"
      )
    );

    const provides = scope.location(reference("@provides"));
    expect(provides).toEqual(directive("provides"));
  });

  it("identifies scopes with @id", () => {
    // @id must be linked in this scope or its parent
    expect(
      Scope.create(
        fromDoc(
          parse(`
      extend schema
      @id(url: "https://example.com/myself")
    `)
        )
      ).self
    ).toBeUndefined();

    const scope = Scope.create(
      fromDoc(
        parse(`
      extend schema
      @id(url: "https://example.com/myself")
      @link(url: "https://specs.apollo.dev/link/v0.3")
      @link(url: "https://specs.apollo.dev/id/v1.0")
    `)
      )
    );
    expect(scope.self).toMatchObject({
      name: "myself",
      location: LinkUrl.from("https://example.com/myself"),
    });
  });
});

function reference(name: string): ReferenceNode {
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

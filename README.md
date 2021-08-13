# @apollo/core-schema

*typescript library for processing core schemas*

to install via npm:

```sh
npm install @apollo/core-schema
```

to build from source:

```sh
npm install
npm test
```

# quick examples

## check a document
```typescript
const core = CoreSchema.graphql `
  schema
    @core(feature: "https://lib.apollo.dev/core/v0.1")
    @core(feature: "https://example.com/someSpec/v1.0")
    @core(feature: "https://spec.example.io/another/v1.0", as: "renamed")
  { query: Query }

  type Query {
    field: Int @someSpec(message: "this should go away")
    another: String @renamed(message: "this stays")
  }

  enum someSpec__Values {
    A B
  }

  enum someSpec__SomeEnum {
    SOME_VALUE
  }

  directive @core(feature: String, as: String, export: Boolean)
    on
    | SCHEMA
    | ENUM
  directive @someSpec(message: String) on FIELD_DEFINITION
  directive @renamed(message: String) on FIELD_DEFINITION
  `

core.check() // throws if there are any core errors on the document,
             // otherwise returns the core (for chaining)
```

## extract specified metadata
```typescript
import CoreSchema from '@apollo/core-schema'

// define a directive binding
const another = new GraphQLDirective({
  name: "@other",
  locations: ["OBJECT", "FIELD_DEFINITION"],
  args: { value: { type: GraphQLInt } }
  extensions: {
    // exetnsions.specifiedBy MUST be present and MUST be a valid
    // feature url. this tells the core schema processor what
    // feature to look for in the document.
    specifiedBy: "https://two.example.com/other/v1.0#@other",
  },
});

// Parse a schema
const example = CoreSchema.graphql`
  schema @core(feature: "https://specs.apollo.dev/core/v0.1")
    @core(feature: "https://example.com/other/v1.0")
    @core(feature: "https://two.example.com/other/v1.2", as: "another")
  { query: Query }

  type User @other(input: "hello") {
    field: Int @another(value: 32)
  }
`;

const user: ObjectTypeDefinitionNode = example.document
  .definitions[1] as any;
const field = user.fields![0];


expect([...example.read(another, field)]).toMatchInlineSnapshot(`
  Array [
    Object {
      "canonicalName": "@other",
      "data": Object {
        "value": 32,
      },
      "directive": (inline graphql):8:24
  7 |           type User @other(input: "hello") {
  8 |             field: Int @another(value: 32)
    |                        ^
  9 |           },
      "feature": Feature {
        "directive": (inline graphql):4:13
  3 |             @core(feature: "https://example.com/other/v1.0")
  4 |             @core(feature: "https://two.example.com/other/v1.2", as: "another")
    |             ^
  5 |           { query: Query },
        "name": "another",
        "purpose": undefined,
        "url": FeatureUrl {
          "element": undefined,
          "identity": "https://two.example.com/other",
          "name": "other",
          "version": Version {
            "major": 1,
            "minor": 2,
          },
        },
      },
      "node": (inline graphql):8:13
  7 |           type User @other(input: "hello") {
  8 |             field: Int @another(value: 32)
    |             ^
  9 |           },
    },
  ]
`);

// you can also give `read()` a feature url, optionally with a hash
// in this case, read() has no way to deserialize the data, so it is not returned.
expect([...example.read("https://example.com/other/v1.0", user)]).toMatchInlineSnapshot(`
  Array [
    Object {
      "canonicalName": "@other",
      "directive": (inline graphql):7:21
  6 |
  7 |           type User @other(input: "hello") {
    |                     ^
  8 |             field: Int @another,
      "feature": Feature {
        "directive": (inline graphql):3:13
  2 |           schema @core(feature: "https://specs.apollo.dev/core/v0.1")
  3 |             @core(feature: "https://example.com/other/v1.0")
    |             ^
  4 |             @core(feature: "https://two.example.com/other/v1.2", as: "another"),
        "name": "other",
        "purpose": undefined,
        "url": FeatureUrl {
          "element": undefined,
          "identity": "https://example.com/other",
          "name": "other",
          "version": Version {
            "major": 1,
            "minor": 0,
          },
        },
      },
      "node": (inline graphql):7:11
  6 |
  7 |           type User @other(input: "hello") {
    |           ^
  8 |             field: Int @another,
    },
  ]
`);
```

## getting the feature for a node

```typescript
const core = CoreSchema.graphql`
schema @core(feature: "https://specs.apollo.dev/core/v0.1") {
  query: Query
}

enum core__Purpose { SECURITY }
`

expect(core.featureFor(core.document.definitions[1]).url.toString())
  .toEqual('https://specs.apollo.dev/core/v0.1')
```

## getting the api schema

this is not currently handled, as the algorithm described in the core specification will return invalid schemas
in some cases (e.g. when non-exported inputs are taken as field arguments). doing this correctly requires more
sophisticated analysis, slated for the next version of the spec.
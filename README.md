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

## lookup names in a core schema

get a `Schema` from a document with `Schema.from` and then
look up document names via `schema.scope`:

```typescript
import {Schema, HgRef, ref} from '@apollo/core-schema'

const doc = Schema.from(gql `
  extend schema
    @link(url: "https://specs.apollo.dev/link/v0.3")
    @link(url: "https://example.com/someSpec/v1.0")
    @link(url: "https://spec.example.io/another/v1.0", as: "renamed")
`)
expect(doc.scope.lookup('@link')).toBe(
  HgRef.rootDirective('https://specs.apollo.dev/link/v0.3')
)
expect(doc.scope.lookup('renamed__Type'))).toBe(
  HgRef.named('Type', "https://spec.example.io/another/v1.0")
)
```

## build a document with implicit scope

it's often useful to interpret a document with a set of builtin
links already in scope.

`Scope.from` takes a second argument—the so-called `frame`—to
enable this:

```typescript
const parent = Schema.from(gql `
  extend schema
    @link(url: "https://specs.apollo.dev/link/v0.3")
    @link(url: "https://specs.apollo.dev/federation/v1.0",
          import: "@key @requires @provides @external")
`)

function subgraph(document: DocumentNode) {
  return Schema.from(document, frame)
}

subgraph(gql `
  # @key in the next line will be linked to:
  #
  #   https://specs.apollo.dev/federation/v1.0#@key
  type User @key(field: "id") {
    id: ID!
  }
`)

subgraph(gql `
  # this will shadow the built-in link to @key:
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0",
    import: "@key")

  # @key in the next line will be linked to:
  #
  #   https://specs.apollo.dev/federation/v2.0#@key
  type User @key(field: "id") {
    id: ID!
  }`)
```

## iterate over links from a document
```typescript
function linksFed2(doc: Schema) {
  for (const link of doc.scope) {
    if (link.hgref.graph.satisfies(LinkUrl.from("https://specs.apollo.dev/federation/v2.0"))) {
      // child links federation 2.0
      return true
    }  
  }
  return false
}

expect(
  linksFed2(Schema.basicFrom(gql `
    extend schema @link(url: "https://specs.apollo.dev/federation/v2.0")
  `))
).toBe(true)

expect(
  linksFed2(Schema.basicFrom(gql `
    extend schema @link(url: "https://specs.apollo.dev/federation/v1.9")
  `))
).toBe(false)

expect(
  linksFed2(Schema.basicFrom(gql ``))
).toBe(false)
```

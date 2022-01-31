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
```typescript
import {Scope, reference} from '@apollo/core'

const doc = Scope.create(fromDoc(gql `
  extend schema
    @link(url: "https://specs.apollo.dev/link/v0.3")
    @link(url: "https://example.com/someSpec/v1.0")
    @link(url: "https://spec.example.io/another/v1.0", as: "renamed")
`))
expect(doc.lookup(reference('@link'))).toBe(
  directive('', "https://specs.apollo.dev/link/v0.3")
)
expect(doc.lookup(reference('renamed__Type'))).toBe(
  type('Type', "https://spec.example.io/another/v1.0")
)
```

## build a document with implicit scope
```typescript
const frame = Scope.create(fromDoc(gql `
  extend schema
    @link(url: "https://specs.apollo.dev/link/v0.3")
    @link(url: "https://specs.apollo.dev/federation/v1.0",
          import: "@key @requires @provides @external")
`))

const child = frame.child(fromDoc(gql `
  # @key in the next line will be linked in the parent
  type User @key(field: "id") {
    id: ID!
  }
`))
```

## iterate over links from a document
```typescript
function linksFed2(doc: IScope<Document>) {
  for (const link of doc.links()) {
    if (link.location.graph.satisfies(LinkUrl.from("https://specs.apollo.dev/federation/v2.0"))) {
      // child links federation 2.0
      return true
    }  
  }
  return false
}
```

## match a particular element with a global url
```typescript
const match = doc.matcher(directive('requires', "https://specs.apollo.dev/federation/v2.0"))
visit(doc.root, {
  Directive(node, parent) {
    if (match(node)) {
      // matched @federation::requires
    }
  }
})
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
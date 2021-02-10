# @apollo/core-schema

*Typescript library for processing core schemas*

To install via npm:

```sh
npm install git@github.com:apollographql/core-schema-js
```

To build from source:

```sh
npm install
npm test
```

# Quick examples

## Check a document and derive its export schema
```typescript
// fromSource returns a Pipe<DocumentNode> rather than a DocumentNode. This
// is just a convenience wrapper for function composition. You can get the value `T`
// out of a `Pipe<T> by calling `.value`
fromSource`
  schema
    @core(using: "https://lib.apollo.dev/core/v0.1")
    @core(using: "https://example.com/someSpec/v1.0")
    @core(using: "https://spec.example.io/another/v1.0", as: "renamed", export: true)
  { query: Query }

  type Query {
    field: Int @someSpec(message: "this should go away")
    another: String @renamed(message: "this stays")
  }

  enum someSpec__ExportedEnum @core(export: true) {
    A B
  }

  enum someSpec__SomeEnum {
    SOME_VALUE
  }`
.map(ensure())
.map(exportSchema)
.map(print)
.value; // <- get the printed AST text

/* returns:
  schema {
    query: Query
  }

  type Query {
    field: Int
    another: String @renamed(message: "this stays")
  }

  enum someSpec__ExportedEnum {
    A
    B
  }
*/
```

## Extract specified metadata
```typescript
// Define some bindings for a spec URL
const someSpec = directive(spec`https://example.com/someSpec/v1.0`)({
    FieldAnnotation: one(
        { message: must(Str), },
        'FIELD_DEFINITION'
    ),
    NumAnnotation: one(
        { value: must(Int), items: must(list(must(Int))) },
        'FIELD_DEFINITION'
    ),
})

// Parse a schema
const schema = fromSource({
    src: "example.graphql",
    text: `
        schema
        @core(using: "https://lib.apollo.dev/core/v0.1")
        @core(using: "https://example.com/someSpec/v1.0", as: "renamed")
        { query: Query }

        type Example {
            field: Int @renamed(message: "hello")
            another: String
                @renamed(message: "goodbye")
                @renamed(value: 42, items: [0, 1, 2])
        }
    `
}).value

// The binding is a function we can pass the DocumentNode to to get an
// array of all the places in the schema where it occurred.
//
// (Note that the snapshots serialize the node path, but the actual
// node is being returned.)
expect(someSpec(schema)).toMatchInlineSnapshot(`
    Array [
        Object {
            "FieldAnnotation": Object {
                "message": "hello",
            },
            "is": "FieldAnnotation",
            "on": FieldDefinition <definitions/1/fields/0>,
        },
        Object {
            "FieldAnnotation": Object {
                "message": "goodbye",
            },
            "is": "FieldAnnotation",
            "on": FieldDefinition <definitions/1/fields/1>,
        },
        Object {
            "NumAnnotation": Object {
                "items": Array [0, 1, 2]
                "value": 42,
            },
            "is": "NumAnnotation",
            "on": FieldDefinition <definitions/1/fields/1>,
        },
    ]
`);
```

# Code Overview
- `__tests__/` has tests (not enough yet)
- `serde/` contains serializers and deserializers for data in the AST. This converts between AST nodes
and arbitrary TypeScript objects (typically scalars and plain objects though). The SerDe module doesn't
know anything about specs or namespaces, it just knows how to extract data from the AST in a particular
shape.
- `bind/` contains the data binding layer. This is where we bind *specified* metadata in the AST
to TypeScript objects. Functions in the `bind` layer take a spec, and the first thing they do when
queried is to look up the name of that spec within the document and use it to filter their metadata
sources (which are all directives at this point, but not forever). You can see an example of
the binding layer in action in the [binding for the core spec](./src/specs/core.ts).
- `schema.ts` contains bootstrapping logic and `fromSource`, which quickly generates a pipeline for processing a `DocumentNode`.
- `data.ts` defines `data` and `derive`. These define additional "columns" on AST Nodes (or really, on any JS object whatsoever). We use them frequently to annotate the AST with additional information, including up-tree links (to the parent and document) and parsed metadata. This just creates a symbol and looks it up on the object, but those implementation details are hidden. You can call `set(object, someData, value)` to set `someData` on `object` to `value`, and `get(object, someData)` or `someData(object)` to get the value on the object. You cannot `set` `derive`d values. They are cached on the object, but are read-only.

# Conventions
- Deserializers are expected to fail with some frequency. `Error`s are somewhat expensive to create. Also, it is frequently desirable to process e.g. *all* items in a list (even after one has failed to deserialize)—this ensures that we discover and surface all document issues, beyond the one failure. Thus, rather than creating `Error`s for every single validation error, deserializers return `Result`s, which are either `Ok<T>` or `Err`. `Err`s are not `Error`s—they are small objects, and do not collect a stack on creation. You can call `.toError()` on an `Err` to create an actual JS error with a stack trace.
- All errors which can occur on the document are declared with [`ERR`](./src/err.ts). This returns an `Err` creator
function.
- Some types are named like this: `type Set_TypeOf<S extends Set> = ...`. This convention indicates that the type is a "type function" which extracts the `TypeOf` a `Set`.

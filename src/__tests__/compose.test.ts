import { concat, federate } from "../compose";
import { Source, print } from "graphql";
import fs from "fs";
import path from "path";
import CoreSchema from "../schema";

const products = loadSubgraphSource("products");
const reviews = loadSubgraphSource("reviews");

describe("federate", () => {
  it("adds builtins if needed", () => {
    expect(federate([products, reviews]).data).toMatchInlineSnapshot(`
      Object {
        "definitions": Array [
          <builtin subgraph core>:2:3
      1 |
      2 |   schema
        |   ^
      3 |     @core(feature: "https://specs.apollo.dev/core/v0.2"),
          products:1:1
      1 | enum CURRENCY_CODE {
        | ^
      2 |   USD,
          products:5:1
      4 |
      5 | type Department {
        | ^
      6 |   category: ProductCategory,
          products:10:1
       9 |
      10 | type Money {
         | ^
      11 |   amount: Float,
          products:15:1
      14 |
      15 | """Here are some helpful details about your type"""
         | ^
      16 | type Price {,
          products:24:1
      23 |
      24 | """
         | ^
      25 | This is an Entity, docs:https://www.apollographql.com/docs/federation/entities/,
          products:42:1
      41 |
      42 | enum ProductCategory {
         | ^
      43 |   ALL,
          products:52:1
      51 |
      52 | extend type Query {
         | ^
      53 |   bestSellers(category: ProductCategory = ALL): [Product],
          <builtin subgraph core>:2:3
      1 |
      2 |   schema
        |   ^
      3 |     @core(feature: "https://specs.apollo.dev/core/v0.2"),
          reviews:1:1
      1 | extend type Product @key(fields: "id") {
        | ^
      2 |   id: ID! @external,
          reviews:7:1
      6 |
      7 | """
        | ^
      8 | This is an Entity, docs:https://www.apollographql.com/docs/federation/entities/,
          reviews:17:1
      16 |
      17 | type ReviewSummary {
         | ^
      18 |   totalReviews: Int,
        ],
        "kind": "Document",
      }
    `);
  });

  it("returns a denormalized tree", () => {
    expect(print(federate([products, reviews]).data)).toMatchInlineSnapshot(`
      "schema @<'https://specs.apollo.dev/core/v0.2#@core'>(feature: \\"https://specs.apollo.dev/core/v0.2\\") @<'https://specs.apollo.dev/core/v0.2#@core'>(feature: \\"https://specs.apollo.dev/key/v0.1\\") @<'https://specs.apollo.dev/core/v0.2#@core'>(feature: \\"https://specs.apollo.dev/federation/requires/v0.1\\") @<'https://specs.apollo.dev/core/v0.2#@core'>(feature: \\"https://specs.apollo.dev/federation/provides/v0.1\\") {
        query: Query
      }

      enum CURRENCY_CODE {
        USD
      }

      type Department {
        category: ProductCategory
        url: String
      }

      type Money {
        amount: Float
        currencyCode: CURRENCY_CODE
      }

      \\"\\"\\"Here are some helpful details about your type\\"\\"\\"
      type Price {
        cost: Money
        \\"\\"\\"A number between 0 and 1 signifying the % discount\\"\\"\\"
        deal: Float
        dealSavings: Money
      }

      \\"\\"\\"
      This is an Entity, docs:https://www.apollographql.com/docs/federation/entities/
      You will need to define a __resolveReference resolver for the type you define, docs: https://www.apollographql.com/docs/federation/entities/#resolving
      \\"\\"\\"
      type Product @<'https://specs.apollo.dev/key/v0.1#@key'>(fields: \\"id\\") {
        id: ID!
        title: String
        url: String
        description: String
        price: Price
        salesRank(category: ProductCategory = ALL): Int
        salesRankOverall: Int
        salesRankInCategory: Int
        category: ProductCategory
        images(size: Int = 1000): [String]
        primaryImage(size: Int = 1000): String
      }

      enum ProductCategory {
        ALL
        GIFT_CARDS
        ELECTRONICS
        CAMERA_N_PHOTO
        VIDEO_GAMES
        BOOKS
        CLOTHING
      }

      extend type Query {
        bestSellers(category: ProductCategory = ALL): [Product]
        categories: [Department]
        product(id: ID!): Product
      }

      schema @<'https://specs.apollo.dev/core/v0.2#@core'>(feature: \\"https://specs.apollo.dev/core/v0.2\\") @<'https://specs.apollo.dev/core/v0.2#@core'>(feature: \\"https://specs.apollo.dev/key/v0.1\\") @<'https://specs.apollo.dev/core/v0.2#@core'>(feature: \\"https://specs.apollo.dev/federation/requires/v0.1\\") @<'https://specs.apollo.dev/core/v0.2#@core'>(feature: \\"https://specs.apollo.dev/federation/provides/v0.1\\") {
        query: Query
      }

      extend type Product @<'https://specs.apollo.dev/key/v0.1#@key'>(fields: \\"id\\") {
        id: ID! @external
        reviews: [Review]
        reviewSummary: ReviewSummary
      }

      \\"\\"\\"
      This is an Entity, docs:https://www.apollographql.com/docs/federation/entities/
      You will need to define a __resolveReference resolver for the type you define, docs: https://www.apollographql.com/docs/federation/entities/#resolving
      \\"\\"\\"
      type Review @<'https://specs.apollo.dev/key/v0.1#@key'>(fields: \\"id\\") {
        id: ID!
        rating: Float
        content: String
      }

      type ReviewSummary {
        totalReviews: Int
        averageRating: Float
      }
      "
    `);
  });
});

function loadSubgraphSource(name: string) {
  return new Source(
    fs.readFileSync(path.join(__dirname, name + ".graphql"), "utf8"),
    name
  );
}

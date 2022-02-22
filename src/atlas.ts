import { DocumentNode, DefinitionNode } from 'graphql'
// import LinkUrl, { Loc } from './location'
// import Scope from './scope'

type Query = Loc
type OutputOf<Q extends Query> =
  Q["type"] extends "schema"
    ? DocumentNode
    : DefinitionNode


// function lookup<Q extends Query>(query: Q): Iterable<OutputOf<Q>> {

// }

export interface IAtlas {
  lookup<Q extends Query>(query: Q): Iterable<OutputOf<Q>>
}

// class Atlas extends Map<LinkUrl, Scope> implements IAtlas {
//   lookup<Q extends Query>(query: Q): Iterable<OutputOf<Q>>
// }
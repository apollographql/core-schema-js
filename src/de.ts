import { replay, report } from '@protoplasm/recall'
import { ASTNode, ConstDirectiveNode, DefinitionNode, DirectiveDefinitionNode, DirectiveNode, EnumTypeDefinitionNode, EnumTypeExtensionNode, EnumValueDefinitionNode, InputObjectTypeDefinitionNode, InputObjectTypeExtensionNode, InputValueDefinitionNode, InterfaceTypeDefinitionNode, InterfaceTypeExtensionNode, Kind, NamedTypeNode, ObjectTypeDefinitionNode, ObjectTypeExtensionNode, ScalarTypeDefinitionNode, ScalarTypeExtensionNode, SchemaDefinitionNode, SchemaExtensionNode, UnionTypeDefinitionNode, UnionTypeExtensionNode } from 'graphql'
import { first } from './each'
import err from './error'
import GRef, { byGref, HasGref } from './gref'
import { isAst } from './is'
import LinkUrl from './link-url'

/**
 * A reference could not be matched to a definition.
 * 
 * @param gref 
 * @param nodes 
 * @returns ErrNoDefinition
 */
export const ErrNoDefinition = (gref: GRef, ...nodes: ASTNode[]) =>
  err('NoDefinition', {
    message: 'no definitions found for reference',
    gref,
    nodes
  })

/**
 * A detatched (or denormalized) AST node. Detached nodes have an `gref'
 * property which holds their location within the global graph. This makes them
 * easier to move them between documents, which may have different sets of `@link`
 * directives (and thus different namespaces).
 */
// export type De<T> =
//   T extends (infer E)[]
//     ? De<E>[]
//     :
//   T extends Locatable
//     ? {
//       [K in keyof T]:
//         K extends 'kind' | 'loc'
//           ? T[K]
//           :
//         De<T[K]>
//     } & HasGref
//     :
//   T extends object
//     ? {
//       [K in keyof T]: K extends 'kind' | 'loc'
//         ? T[K]
//         :
//       De<T[K]>
//     }
//     :
//   T


export type Def =
  | DefinitionNode
  | Redirect
export type Defs = Iterable<Def>

export type Locatable =
  | SchemaDefinitionNode
  | ScalarTypeDefinitionNode
  | ObjectTypeDefinitionNode
  | InputValueDefinitionNode
  | InterfaceTypeDefinitionNode
  | UnionTypeDefinitionNode
  | EnumTypeDefinitionNode
  | EnumValueDefinitionNode
  | InputObjectTypeDefinitionNode
  | DirectiveDefinitionNode
  | SchemaExtensionNode
  | ScalarTypeExtensionNode
  | ObjectTypeExtensionNode
  | InterfaceTypeExtensionNode
  | UnionTypeExtensionNode
  | EnumTypeExtensionNode
  | InputObjectTypeExtensionNode
  | DirectiveNode
  | ConstDirectiveNode
  | NamedTypeNode
export type Located<T extends Locatable = Locatable> = T & HasGref


/**
 * Complete `source` definitions with definitions from `atlas`.
 *
 * Emits the set of defs to be added.
 *
 * Reports ErrNoDefinition for any dangling references.
 *
 * @param defs
 * @returns
 */
export function *fill(source: Defs, atlas?: Defs): Defs {
  const notDefined = new Map<GRef, Locatable[]>()
  const seen = new Set<GRef>()
  const atlasDefs = atlas ? byGref(atlas) : null

  const ingest = (defs: Defs) => {
    for (const node of refNodesIn(defs)) {
      if (isRedirect(node)) {
        report(node)        
        continue
      }
      const defs = byGref(source).get(node.gref)
      if (!node.gref) continue
      if (!defs && !seen.has(node.gref) && node.gref.graph !== LinkUrl.GRAPHQL_SPEC)
        if (notDefined.has(node.gref))
          notDefined.get(node.gref)!.push(node)
        else
          notDefined.set(node.gref, [node])
    }
  }

  ingest(source)
  while (notDefined.size) {
    const [ref, nodes] = first(notDefined.entries())!
    notDefined.delete(ref)
    if (seen.has(ref)) continue
    const defs = atlasDefs?.get(ref)
    if (!defs) {
      report(ErrNoDefinition(ref, ...nodes))
      seen.add(ref)
    } else {
      ingest(defs)
      seen.add(ref)
      yield* defs
    }
  }
}

export interface Redirect {
  kind: 'Redirect'
  gref: GRef
  toGref: GRef
  via?: DirectiveNode
}

export const isRedirect = (o: any): o is Redirect => o?.kind === 'Redirect'

// export const Redirected = (gref: GRef, toGref: GRef, via?: DirectiveNode) => ({
//   code: 'Redirect' as const,
//   gref, toGref, via
// })


export function *refNodesIn(defs: Defs | Iterable<ASTNode>): Iterable<Located | Redirect> {
  for (const def of defs) {
    if (isRedirect(def)) yield def
    else yield* deepRefs(def)
  }
}

export const deepRefs: (root: Redirect | ASTNode | ASTNode[]) => Iterable<Located> = replay(
  function *(root: Redirect | ASTNode | Iterable<ASTNode>) {
    if (isLocatable(root) && hasRef(root)) yield root
    for (const child of children(root)) {
      if (isAst(child)) yield *deepRefs(child)
    }
  }
)

type ChildOf<T> =
  T extends (infer E)[]
    ? E
    :
  T extends object
    ? {
      [k in keyof T]: T[k] extends (infer E)[]
        ? E
        : T[k]
    }[keyof T]
    :
  T

export function *children<T>(root: T): Iterable<ChildOf<T>> {
  if (Array.isArray(root)) return yield *root
  if (typeof root === 'object') {
    for (const child of Object.values(root)) {
      if (Array.isArray(child)) yield *child
      else yield child
    }
  }
}

export const hasRef = (o?: any): o is { gref: GRef } =>
  o?.gref instanceof GRef


const LOCATABLE_KINDS = new Set([
  ...Object.values(Kind)
    .filter(k => (k.endsWith('Definition') || k.endsWith('Extension')) &&
      !k.startsWith('Field') &&
      !k.startsWith('Operation') &&
      !k.startsWith('Fragment') &&
      !k.startsWith('Variable')),
  Kind.DIRECTIVE,
  Kind.NAMED_TYPE,
])

export function isLocatable(o: any): o is Locatable {
  return LOCATABLE_KINDS.has(o?.kind)
}

export function isLocated(o: any): o is Located {
  return isLocatable(o) && hasRef(o)
}

import { replay, report } from '@protoplasm/recall'
import { ASTNode, DefinitionNode, DirectiveNode, Kind, NamedTypeNode } from 'graphql'
import { groupBy } from './each'
import err from './error'
import HgRef from './hgref'
import { isAst } from './is'

export const ErrNoDefinition = (hgref: HgRef, ...nodes: ASTNode[]) =>
  err('NoDefinition', {
    message: 'no definitions found for reference',
    hgref,
    nodes
  })

/**
 * A detatched (or denormalized) AST node. Detached nodes have an `hgref: HgRef`
 * property which holds their location within the global graph. This makes them
 * easier to move them between documents, which may have different sets of `@link`
 * directives (and thus different namespaces).
 */
export type De<T> =
  T extends (infer E)[]
    ? De<E>[]
    :
  T extends Locatable
    ? { hgref: HgRef } & {
      [K in keyof T]:
        K extends 'kind' | 'loc'
          ? T[K]
          :
        De<T[K]>
    }
    :
  T extends object
    ? {
      [K in keyof T]: K extends 'kind' | 'loc'
        ? T[K]
        :
      De<T[K]>
    }
    :
  T

export type Def = De<DefinitionNode>
export type Defs = Iterable<Def>

export type Locatable =
  | DefinitionNode
  | DirectiveNode
  | NamedTypeNode

export type Located = Locatable & { hgref: HgRef }


/**
 * group detached nodes (or anything with an 'hgref' really )
 */
export const byRef = groupBy(<T extends { hgref?: HgRef }>(node: T) => node.hgref)

/**
 * Complete `source` definitions with definitions from `atlas`.
 *
 * Returns the set of defs to be added.
 *
 * Reports ErrNoDefinition for any dangling references.
 *
 * @param defs
 * @returns
 */
export function fill(source: Defs, atlas?: Defs): Defs {
  const notDefined = new Map<HgRef, Locatable[]>()
  const failed = new Set<HgRef>()
  const added = new Set<HgRef>()
  const fill: Def[] = []
  const atlasDefs = atlas ? byRef(atlas) : null

  const ingest = (defs: Defs) => {
    for (const ref of refsIn(defs)) {
      const defs = byRef(source).get(ref.hgref)
      if (!defs && !added.has(ref.hgref))
        if (notDefined.has(ref.hgref))
          notDefined.get(ref.hgref)!.push(ref)
        else
          notDefined.set(ref.hgref, [ref])
    }
  }

  ingest(source)
  while (notDefined.size) {
    const [ref, nodes] = notDefined.entries().next().value
    notDefined.delete(ref)
    if (failed.has(ref)) continue
    if (added.has(ref)) continue
    const defs = atlasDefs?.get(ref)
    if (!defs) {
      report(ErrNoDefinition(ref, ...nodes))
      failed.add(ref)
    } else {
      ingest(defs)
      added.add(ref)
      fill.push(...defs)
    }
  }

  return fill
}

export function *refsIn(defs: Defs | Iterable<ASTNode>): Iterable<Located> {
  for (const def of defs)
    yield* deepRefs(def)
}

export const deepRefs: (root: ASTNode | ASTNode[]) => Iterable<Located> = replay(
  function *(root: ASTNode | Iterable<ASTNode>) {
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

export const hasRef = (o?: any): o is { hgref: HgRef } =>
  o?.hgref instanceof HgRef


const LOCATABLE_KINDS = new Set([
  ...Object.values(Kind)
    .filter(k => k.endsWith('Definition') || k.endsWith('Extension'))
    .filter(k => !k.startsWith('Field'))
    .filter(k => k !== 'OperationDefinition' && k !== 'FragmentDefinition'),
  Kind.DIRECTIVE,
  Kind.NAMED_TYPE,
])

export function isLocatable(o: any): o is Locatable {
  return LOCATABLE_KINDS.has(o?.kind)
}

export function isLocated(o: any): o is Located {
  return isLocatable(o) && hasRef(o)
}

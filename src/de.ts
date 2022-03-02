import recall, { report } from '@protoplasm/recall'
import { ASTNode, DefinitionNode, DirectiveNode, ExecutableDefinitionNode, Kind, NamedTypeNode } from 'graphql'
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
 * group defs by hgref
 */
// export const byRef = recall(
//   function byRef<T extends { hgref?: HgRef }>(...sources: Iterable<T>[]): Readonly<Map<HgRef, Iterable<T>>> {
//     if (sources.length === 0) return Object.freeze(new Map)
//     if (sources.length > 1) {
//       const defs = new Map<HgRef, readonly T[]>()
//       for (const src of sources) for (const ent of byRef(src))
//         defs.set(ent[0],
//           Object.freeze((defs.get(ent[0]) ?? []).concat(ent[1] as T[])))
//       return Object.freeze(defs)
//     }
//     const [source] = sources
//     const defs = new Map<HgRef, T[]>()
//     for (const def of source) {
//       const {hgref} = def
//       if (!hgref) continue
//       const existing = defs.get(hgref)
//       if (existing) existing.push(def)
//       else defs.set(hgref, [def])
//     }
//     for (const ary of defs.values()) { Object.freeze(ary) }
//     return Object.freeze(defs)
//   }
// )
export const byRef = groupBy((node: { hgref?: HgRef }) => node.hgref)

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
    for (const ref of refsInDefs(defs)) {
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

export function *refsInDefs(defs: Defs): Iterable<Located> {
  for (const def of defs)
    yield* deepRefs(def)
}

export function *deepRefs(root: ASTNode | Iterable<ASTNode>): Iterable<Located> {
  if (isLocatable(root) && hasRef(root)) yield root
  for (const child of children(root)) {
    if (isAst(child)) yield *deepRefs(child)
  }
}

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

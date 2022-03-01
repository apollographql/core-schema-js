import recall, { report } from '@protoplasm/recall'
import { ASTNode, Kind } from 'graphql'
import err from './error'
import HgRef from './hgref'
import { isAst } from './is'
import { isLocatable, Locatable, Located } from './schema'

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

export type Def = De<Located>
export type Defs = Iterable<Def>


/**
 * group defs by hgref
 */
export const byRef = recall(
  function byRef(...sources: Defs[]): Readonly<Map<HgRef, Defs>> {
    if (sources.length === 0) return Object.freeze(new Map)
    if (sources.length > 1) {
      const defs = new Map<HgRef, readonly Def[]>()
      for (const src of sources) for (const ent of byRef(src))
        defs.set(ent[0],
          Object.freeze((defs.get(ent[0]) ?? []).concat(ent[1] as Def[])))
      return Object.freeze(defs)
    }
    const [source] = sources
    const defs = new Map<HgRef, Def[]>()
    for (const def of source) {
      const {hgref} = def
      const existing = defs.get(hgref)
      if (existing) existing.push(def)
      else defs.set(hgref, [def])
    }
    for (const ary of defs.values()) { Object.freeze(ary) }
    return Object.freeze(defs)
  }
)

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
export function fill(atlas: Defs, source: Defs): Defs {
  const notDefined = new Map<HgRef, Locatable[]>()
  const failed = new Set<HgRef>()
  const addDefs = new Map<HgRef, Defs>()
  const fill: Def[] = []

  const ingest = (def: ASTNode) => {
    for (const node of deepRefs(def)) {
      const [first] = byRef(source).get(node.hgref) ?? []
      if (!first && !addDefs.has(node.hgref))
        if (notDefined.has(node.hgref))
          notDefined.get(node.hgref)?.push(node)
        else
          notDefined.set(node.hgref, [node])
    }
  }

  for (const def of source)
    ingest(def)

  while (notDefined.size) {
    const [ref, nodes] = notDefined.entries().next().value
    notDefined.delete(ref)
    if (failed.has(ref)) continue
    if (addDefs.has(ref)) continue
    const defs = byRef(atlas).get(ref)
    if (!defs) {
      report(ErrNoDefinition(ref, ...nodes))
      failed.add(ref)
    } else {
      for (const def of defs) ingest(def)
      addDefs.set(ref, defs)
      fill.push(...defs)
    }
  }  

  return fill
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
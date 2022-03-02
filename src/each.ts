import recall from "@protoplasm/recall"
import { Defs } from "./de"
import HgRef from "./hgref"

// export const x = recall(
//   function by<T, G extends (item: T) => any>(grouper: G, ...sources: Iterable<T>[]): Readonly<Map<ReturnType<G>, Iterable<T>>> {
//     if (sources.length === 0) return Object.freeze(new Map)

//     type Key = ReturnType<G>
    
//     if (sources.length > 1) {
//       const defs = new Map<Key, readonly T[]>()
//       for (const src of sources) for (const ent of groupBy(grouper, src))
//         defs.set(ent[0],
//           Object.freeze((defs.get(ent[0]) ?? []).concat(ent[1] as T[])))
//       return Object.freeze(defs)
//     }

//     const [source] = sources
//     const defs = new Map<Key, T[]>()
//     for (const def of source) {
//       const key = grouper(def)
//       const existing = defs.get(key)
//       if (existing) existing.push(def)
//       else defs.set(key, [def])
//     }
//     for (const ary of defs.values()) { Object.freeze(ary) }
//     return Object.freeze(defs)
//   }
// )

type ItemType<G extends (item: any) => any> = Parameters<G>[0]

export const groupBy = recall (
  <G extends (item: any) => any>(grouper: G) => {
    const groupSources = recall(
      <T extends ItemType<G>>(...sources: Iterable<T>[]): Readonly<Map<ReturnType<G>, Iterable<T>>> => {
        if (sources.length === 0) return Object.freeze(new Map)

        type Key = ReturnType<G>
        
        if (sources.length > 1) {
          const defs = new Map<Key, readonly T[]>()
          for (const src of sources) for (const ent of groupSources(src))
            defs.set(ent[0],
              Object.freeze((defs.get(ent[0]) ?? []).concat(ent[1] as T[])))
          return Object.freeze(defs)
        }

        const [source] = sources
        const defs = new Map<Key, T[]>()
        for (const def of source) {
          const key = grouper(def)
          const existing = defs.get(key)
          if (existing) existing.push(def)
          else defs.set(key, [def])
        }
        for (const ary of defs.values()) { Object.freeze(ary) }
        return Object.freeze(defs)
      })
    return groupSources
  }
)

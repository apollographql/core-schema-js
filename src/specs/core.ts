import { Deserialized, Str, Bool } from '../metadata'
import { spec, Spec } from '../spec'
import { derive } from '../data'
import { DirectiveLocation } from 'graphql'
import { layer, one, repeatable } from '../layer'
import { Must } from '../is'

const v0_1 = spec `https://lib.apollo.dev/core/v0.1`

export const SpecUrl = v0_1.scalar `SpecUrl` (Spec)

export const core = layer `https://lib.apollo.dev/core/v0.1` ({
  Using: repeatable({
    using: SpecUrl.must,
    as: Str,  
  }, 'SCHEMA'),
  Export: one({
    export: Bool.must
  }, ...Object.values(DirectiveLocation))
})

export const Using = core.Using
export const Export = core.Export

export const name = derive <string, Using>
  `Name for spec within document`
    ((using: Using) => using.as ?? using.using.name)

export type Using = Must<Deserialized<typeof core.Using>>
export type Export = Must<Deserialized<typeof core.Export>>

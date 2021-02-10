import { Str, Bool, must } from '../serde'
import { spec, Spec } from '../spec'
import { DirectiveLocation } from 'graphql'
import { scalar, directive, one, repeatable } from '../bind'

const core = spec `https://lib.apollo.dev/core/v0.1`

export const SpecUrl = scalar(core) ('SpecUrl', Spec)

export default directive(core) ({
  Using: repeatable({
    using: must(SpecUrl),
    as: Str,  
    export: Bool,
  }, 'SCHEMA'),
  Export: one({
    export: must(Bool),
  }, ...Object.values(DirectiveLocation))
})

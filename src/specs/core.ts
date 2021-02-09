import { Str, Bool } from '../metadata'
import { spec, Spec } from '../spec'
import { DirectiveLocation } from 'graphql'
import { scalar, directive, one, repeatable } from '../bind'

const core = spec `https://lib.apollo.dev/core/v0.1`

export const SpecUrl = scalar(core) ('SpecUrl', Spec)

export default directive(core) ({
  Using: repeatable({
    using: SpecUrl.must,
    as: Str,  
  }, 'SCHEMA'),
  Export: one({
    export: Bool.must
  }, ...Object.values(DirectiveLocation))
})

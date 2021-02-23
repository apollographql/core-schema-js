import { DirectiveLocation } from 'graphql'
import { Spec } from '../spec'
import { scalar, directive } from '../bind'
import { Str, Bool, must } from '../serde'

export const SpecUrl = scalar('https://lib.apollo.dev/core/v0.1', 'SpecUrl', Spec)

export const core = directive('https://lib.apollo.dev/core/v0.1', 'core', {
  using: must(SpecUrl),
  as: Str,  
  export: Bool,
}, 'repeatable on', 'SCHEMA')

export const surface = directive('https://lib.apollo.dev/core/v0.1', 'core__surface', {
  export: must(Bool)
}, 'on', ...Object.values(DirectiveLocation))

export default core

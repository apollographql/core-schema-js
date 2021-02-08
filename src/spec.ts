//! Spec url handling
//!
//! `Spec`s are parsed from URL strings and extract the spec's:
//!   - **identity**, which is the URL excluding the version specifier,
//!   - **name**, which is the second-to-last path segment of the URL,
//!     (typically the name of the bare directive exported by the spec), and
//!   - **version**, specified in the last URL path segment.
//!
//! # Example:
//! ```
//! use using::*;
//! assert_eq!(
//!   Spec::parse("https://spec.example.com/specA/v1.0")?,
//!   Spec::new("https://spec.example.com/specA", "specA", (1, 0))
//! );
//! Ok::<(), SpecParseError>(())
//! ```

import { URL } from 'url'
import { asResultFn, isErr, ok, Result } from './err'
import { asString, AsString } from './is'
import { Coder, customScalar, CustomScalarOf } from './metadata'
import { Version } from './version'

import ERR from './err'

export const ErrNoPath = ERR `NoPath` (
  ({ url }: { url: URL }) => `spec url does not have a path: ${url}`)

export const ErrNoName = ERR `NoName` (
  ({ url }: { url: URL }) => `spec url does not specify a name: ${url}`)

export const ErrNoVersion = ERR `NoVersion` (
  ({ url }: { url: URL }) => `spec url does not specify a version: ${url}`)

export class Spec {
  constructor(
    public readonly identity: string,
    public readonly name: string,
    public readonly version: Version
  ) {}

  /// Parse a spec URL or throw
  public static parse(input: string): Spec {
    const result = this.decode(input)
    if (isErr(result)) throw result.toError()
    return result.ok
  }

  /// Decode a spec URL
  public static decode(input: string): Result<Spec> {
    const result = parseUrl(input)
    if (isErr(result)) return result
    const url = result.ok
    const path = url.pathname.split('/')
    const verStr = path.pop()
    if (!verStr) return ErrNoVersion({ url })
    const version = Version.parse(verStr)
    const name = path[path.length - 1]
    if (!name) throw ErrNoName({ url })
    url.hash = ''
    url.search = ''
    url.password = ''
    url.username = ''
    url.pathname = path.join('/')
    return ok(new Spec(url.toString(), name, version))
  }

  toString() {
    return `${this.identity}/${this.version}`
  }

  scalar(...nameInput: AsString) {
    const name = asString(nameInput)
    return <C extends Coder<any>>(coder: C): CustomScalarOf<C> & SpecifiedScalar => {
      return Object.assign(customScalar(coder), {
        spec: this,
        name,
      }) as any
    }
  }
}


const parseUrl = asResultFn((url: string) => new URL(url))

export interface SpecifiedScalar {
  readonly spec: Spec
  readonly name: string
}

export const spec = (...input: AsString) =>
  Spec.parse(asString(input))


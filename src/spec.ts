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
    return this.decode(input).unwrap()
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

  /**
   * Return true if and only if this spec satisfies the `requested`
   * spec.
   * 
   * @param request
   */
  public satisfies(requested: Spec): boolean {
    return requested.identity === this.identity &&
           this.version.satisfies(requested.version)
  }

  get url() {
    return `${this.identity}/${this.version}`
  }

  toString() {
    return `Spec <${this.url}>`
  }
}

const parseUrl = asResultFn((url: string) => new URL(url))

export const spec = (...input: AsString) =>
  Spec.parse(asString(input))


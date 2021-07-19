
import { URL } from 'url'
import { asResultFn, isErr, ok, Result } from './err'
import { Version } from './version'

import ERR from './err'

export const ErrNoPath = ERR `NoPath` (
  ({ url }: { url: URL }) => `spec url does not have a path: ${url}`)

export const ErrNoName = ERR `NoName` (
  ({ url }: { url: URL }) => `spec url does not specify a name: ${url}`)

export const ErrNoVersion = ERR `NoVersion` (
  ({ url }: { url: URL }) => `spec url does not specify a version: ${url}`)

export default class FeatureUrl {
  constructor(
    public readonly identity: string,
    public readonly name: string,
    public readonly version: Version
  ) {}

  /// Parse a spec URL or throw
  public static parse(input: string): FeatureUrl {
    return this.decode(input).unwrap()
  }

  /// Decode a spec URL
  public static decode(input: string): Result<FeatureUrl> {
    const result = parseUrl(input)
    if (isErr(result)) return result
    const url = result.ok
    const path = url.pathname.split('/')
    const verStr = path.pop()
    if (!verStr) return ErrNoVersion({ url })
    const version = Version.parse(verStr)
    const name = path[path.length - 1]
    if (!name) return ErrNoName({ url })
    url.hash = ''
    url.search = ''
    url.password = ''
    url.username = ''
    url.pathname = path.join('/')
    return ok(new FeatureUrl(url.toString(), name, version))
  }

  /**
   * Return true if and only if this spec satisfies the `requested`
   * spec.
   * 
   * @param request
   */
  public satisfies(requested: FeatureUrl): boolean {
    return requested.identity === this.identity &&
           this.version.satisfies(requested.version)
  }

  public equals(other: FeatureUrl) {
    return this.identity === other.identity &&
      this.version.equals(other.version)
  }

  get url() {
    return `${this.identity}/${this.version}`
  }

  toString() {
    return `Feature <${this.url}>`
  }
}

const parseUrl = asResultFn((url: string) => new URL(url))

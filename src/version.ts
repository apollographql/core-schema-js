import err from './error'

export const ErrVersionParse = (input: string) =>
  err('VersionParse', {
    message: `expected a version specifier like "v9.8", got "${input}"`,
    input,
  })

/**
 * Versions are a (major, minor) number pair.
 *
 * Versions implement `PartialOrd` and `Ord`, which orders them by major and then
 * minor version. Be aware that this ordering does *not* imply compatibility. For
 * example, `Version(2, 0) > Version(1, 9)`, but an implementation of `Version(2, 0)`
 * *cannot* satisfy a request for `Version(1, 9)`. To check for version compatibility,
 * use [the `satisfies` method](#satisfies).
 */
export class Version {
  constructor(public readonly major: number, public readonly minor: number) {}

  /**
   * Parse a version specifier of the form "v(major).(minor)" or throw
   *
   * # Example
   * ```
   * expect(Version.parse('v1.0')).toEqual(new Version(1, 0))
   * expect(Version.parse('v0.1')).toEqual(new Version(0, 1))
   * expect(Version.parse("v987.65432")).toEqual(new Version(987, 65432)) 
   * ```
   */
  public static parse(input: string): Version {
    const match = input.match(this.VERSION_RE)
    if (!match) throw ErrVersionParse(input)
    return new this(+match[1], +match[2])
  }

  /**
   * Return true if and only if this Version satisfies the `required` version
   *
   * # Example
   * ```
   * expect(new Version(1, 0).satisfies(new Version(1, 0))).toBe(true)
   * expect(new Version(1, 2).satisfies(new Version(1, 0))).toBe(true)
   * expect(new Version(2, 0).satisfies(new Version(1, 9))).toBe(false)
   * expect(new Version(0, 9).satisfies(new Version(0, 8))).toBe(false)
   * ```
   **/
  public satisfies(required: Version): boolean {
    const {major, minor} = this
    const {major: rMajor, minor: rMinor} = required
    return rMajor == major && (
      major == 0
        ? rMinor == minor
        : rMinor <= minor
    )
  }

  /**
   * a string indicating this version's compatibility series. for release versions (>= 1.0), this
   * will be a string like "v1.x", "v2.x", and so on. experimental minor updates carry no expectation
   * of compatibility, so those will just return the same thing as `this.toString()`.
   */
  public get series() {
    const {major} = this
    return major > 0 ? `${major}.x` : String(this)
  }

  /**
   * return the string version tag, like "v2.9"
   * 
   * @returns a version tag
   */
  public toString() {
    return `v${this.major}.${this.minor}`
  }

  /**
   * return true iff this version is exactly equal to the provided version
   * 
   * @param other the version to compare
   * @returns true if versions are strictly equal
   */
  public equals(other: Version) {
    return this.major === other.major && this.minor === other.minor
  }

  private static VERSION_RE = /^v(\d+)\.(\d+)$/
}

export default Version

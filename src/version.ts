import { default as ERR, isErr, ok, Result } from './err'
import { asString, AsString } from './is'

export type AsVersion = AsString | [number, number]

export default (...input: AsVersion) => Version.from(...input)

export const ErrVersionParse = ERR `VersionParse` (
  (props: { got: string }) =>
    `expected a version specifier like "v9.8", got "${props.got}"`)

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
   * use using::Version;
   * assert_eq!(Version::parse("v1.0")?, Version(1, 0));
   * assert_eq!(Version::parse("v0.1")?, Version(0, 1));
   * assert_eq!(Version::parse("v987.65432")?, Version(987, 65432));
   * # Ok::<(), using::VersionParseError>(())
   * ```
   */
  public static parse(input: string): Version {
    return this.decode(input).unwrap()
  }

  public static decode(input: string): Result<Version> {
    const match = input.match(this.VERSION_RE)
    if (!match) return ErrVersionParse({ got: input })
    return ok(new this(+match[1], +match[2]))
  }

  public static from(...input: AsVersion) {
    const str = asString(input)
    return str
      ? Version.parse(str.startsWith('v') ? str : `v${str}`)
      : new Version(...input as [number, number])
  }

  /**
   * Return true if and only if this Version satisfies the `required` version
   *
   * # Example
   * ```
   * assert(new Version(1, 0).satisfies(new Version(1, 0)))
   * assert(new Version(1, 2).satisfies(new Version(1, 0)))
   * assert(!(new Version(2, 0).satisfies(new Version(1, 9))))
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

  public toString() {
    return `v${this.major}.${this.minor}`
  }

  private static VERSION_RE = /^v(\d+)\.(\d+)$/
}

// TODO: Convert tests
// #[cfg(test)]
// mod tests {
//     use super::{Version, VersionParseError};

//     #[test]
//     fn it_parses_valid_version_specifiers() -> Result<(), VersionParseError> {
//         assert_eq!(Version::parse("v0.0")?, Version(0, 0));
//         assert_eq!(Version::parse("v1.0")?, Version(1, 0));
//         assert_eq!(Version::parse("v99.0")?, Version(99, 0));
//         assert_eq!(Version::parse("v2.3")?, Version(2, 3));
//         assert_eq!(Version::parse("v12.34")?, Version(12, 34));
//         assert_eq!(Version::parse("v987.654")?, Version(987, 654));
//         Ok(())
//     }

//     #[test]
//     fn it_errors_on_invalid_specifiers() {
//         assert!(matches!(Version::parse("bloop"), Err(VersionParseError)));
//         assert!(matches!(Version::parse("v0."), Err(VersionParseError)));
//         assert!(matches!(Version::parse("v0.?"), Err(VersionParseError)));
//         assert!(matches!(Version::parse("v1.x"), Err(VersionParseError)));
//         assert!(matches!(
//             Version::parse("v0.1-tags_are_not_supported"),
//             Err(VersionParseError)
//         ));
//     }

//     #[test]
//     fn it_still_parses_version_specifiers_which_are_slightly_out_of_spec(
//     ) -> Result<(), VersionParseError> {
//         assert_eq!(Version::parse("v01.0002")?, Version(1, 2));
//         Ok(())
//     }

//     #[test]
//     fn it_compares_minor_version_differences_ok() {
//         assert!(Version(1, 5).satisfies(&Version(1, 0)));
//         assert!(!Version(1, 0).satisfies(&Version(1, 1)));
//     }

//     #[test]
//     fn it_compares_zerodot_series_version_differences_ok() {
//         assert!(Version(0, 1).satisfies(&Version(0, 1)));
//         assert!(!Version(0, 2).satisfies(&Version(0, 1)));
//     }

//     #[test]
//     fn it_compares_major_version_differences_ok() {
//         assert!(!Version(2, 2).satisfies(&Version(1, 2)));
//     }

//     #[test]
//     fn it_formats_itself() {
//         assert_eq!(format!("{}", Version(0, 1)), "v0.1");
//         assert_eq!(format!("{}", Version(1234, 5678)), "v1234.5678");
//     }
// }

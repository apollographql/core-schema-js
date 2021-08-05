// autogenerated by ../generate-errors.js
// regenerate when new error types are added anywhere in the project.
// to regenerate: npm run build && node ./generate-errors

import { ErrNoData, ErrEvalStackEmpty, ErrCheckFailed } from "./core";
import { ErrNoPath, ErrNoName, ErrNoVersion } from "./feature-url";
import {
  ErrExtraSchema,
  ErrNoSchema,
  ErrNoCore,
  ErrBadFeature,
  ErrOverlappingNames,
} from "./schema";
import { ErrVersionParse } from "./version";

export type AnyError = ReturnType<
  | typeof ErrNoData
  | typeof ErrEvalStackEmpty
  | typeof ErrCheckFailed
  | typeof ErrNoPath
  | typeof ErrNoName
  | typeof ErrNoVersion
  | typeof ErrExtraSchema
  | typeof ErrNoSchema
  | typeof ErrNoCore
  | typeof ErrBadFeature
  | typeof ErrOverlappingNames
  | typeof ErrVersionParse
>;

const ERROR_CODES = new Set([
  "NoData",
  "EvalStackEmpty",
  "CheckFailed",
  "NoPath",
  "NoName",
  "NoVersion",
  "ExtraSchema",
  "NoSchema",
  "NoCore",
  "BadFeature",
  "OverlappingNames",
  "VersionParse",
]);

export function isAnyError(o: any): o is AnyError {
  return ERROR_CODES.has(o?.code);
}
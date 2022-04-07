const { defaults } = require("jest-config");

module.exports = {
  testEnvironment: "node",
  preset: "ts-jest",
  testMatch: null,
  testRegex: ".*\\.test\\.(js|ts)$",
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/"
  ],
  snapshotSerializers: [
    ...defaults.snapshotSerializers,
    './src/snapshot-serializers/ast.ts',
    './src/snapshot-serializers/raw.ts',
    './src/snapshot-serializers/gref.ts',
    './src/snapshot-serializers/iterable.ts',
    './src/snapshot-serializers/redirect.ts',
  ],
  moduleFileExtensions: [...defaults.moduleFileExtensions, "ts", "tsx"],
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/tsconfig.test.json",
      diagnostics: false
    }
  }
};

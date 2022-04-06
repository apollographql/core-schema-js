const fs = require('fs')
const path = require('path')
const readdir = require('util').promisify(fs.readdir)
const write = require('util').promisify(fs.writeFile)
const exec = require('util').promisify(require('child_process').exec)

const DIR = path.resolve(process.argv[2]) || __dirname
const OUTPUT = path.join(DIR, 'src', 'errors.ts')

const allErrors = new Map

async function main() {
  for await (const file of walk(path.join(DIR, 'dist'))) {
    if (!file.endsWith('.js')) continue
    
    // the index file re-exports some errors, ignore it
    if (file === 'index.js') continue

    const modulePath = path.join(DIR, 'dist', path.basename(file, '.js'))
    let sourcePath = './' + modulePath.slice(path.join(DIR, 'dist').length + 1)
    if (sourcePath.endsWith('/index'))
      sourcePath = sourcePath.slice(0, sourcePath.length - '/index'.length)
    const mod = require(file)
    const errors = Object.keys(mod)
      .filter(name => name.startsWith('Err'))
      .map(err => err.slice('Err'.length))

    if (!errors.length) continue

    for (const code of errors) {
      const fn = mod['Err' + code]
      const existing = allErrors.get(code)
      if (existing) {
        if (existing.fn !== fn)
          throw new Error(`error code ${code} is defined in multiple modules: ${sourcePath} and ${existing}`)
        if (existing.path.length > sourcePath.length)
          allErrors.set(code, {path: sourcePath, fn: mod['Err' + code]})
      } else {
        allErrors.set(code, {path: sourcePath, fn: mod['Err' + code]})
      }
    }
  }

  const allModules = new Map
  for (const [code, {path}] of allErrors) {
    if (!allModules.has(path)) allModules.set(path, [])
    allModules.get(path).push(code)
  }

  if (!allErrors.size) {
    console.warn('no error codes found, errors.ts not written')
    return
  }

  const allCodes = [...allErrors.keys()]
  await write(OUTPUT,
`// autogenerated by ../generate-errors.js
// regenerate when new error types are added anywhere in the project.
// to regenerate: npm run build && node ./generate-errors

${[...allModules].map(([path, codes]) =>
  `import { ${codes.map(code => 'Err' + code).join(', ')} } from "${path}"`
).join('\n')}

export type AnyError = ReturnType<${
  allCodes
    .map(code => 'typeof Err' + code)
    .join('|')
}>

const ERROR_CODES = new Set(${JSON.stringify(allCodes)})

export function isAnyError(o: any): o is AnyError {
  return ERROR_CODES.has(o?.code)
}
`)
  await exec(`npx prettier -w "${OUTPUT}"`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

async function* walk(dir) {
  for await (const d of await fs.promises.opendir(dir)) {
    const entry = path.join(dir, d.name)
    if (d.isDirectory()) yield* walk(entry)
    else if (d.isFile()) yield entry
  }
}

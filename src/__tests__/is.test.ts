import { AsString, asString } from "../is"

describe('asString', () => {
  it('is used to make functions which can either take strings or template invocations', () => {
    function stringify(...args: AsString) {
      return asString(args)
    }

    expect(stringify('hello world')).toBe('hello world')
    expect(stringify `hello ${'cruel'} world`).toBe('hello cruel world')
  })

  it('takes an array containing exactly one string and returns it unchanged', () => {
    expect(asString(['hello world'])).toBe('hello world')
  })
  
  it('takes a template invocation and runs it through String.raw before returning it', () => {
    expect( ((...args: AsString) => asString(args)) `hello ${[1, 2, 3].reduce((x, y) => x + y)} world`)
      .toBe('hello 6 world')
  })
})
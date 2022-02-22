import {LinkUrl} from '../location'
import {HgRef, Term} from '../hgref'

describe('LinkUrl.parse', () => {
  it('parses urls with names and versions', () => {
    const url = LinkUrl.parse('https://specs.apollo.dev/federation/v2.0')
    expect(url.name).toBe('federation')
    expect(url.version).toEqual({ major: 2, minor: 0 })
    expect(url.href).toBe('https://specs.apollo.dev/federation/v2.0')
  })

  it('parses urls with version only', () => {
    const url = LinkUrl.parse('https://specs.apollo.dev/v2.0')
    expect(url.name).toBeUndefined()
    expect(url.version).toEqual({ major: 2, minor: 0 })
    expect(url.href).toBe('https://specs.apollo.dev/v2.0')
  })

  it('parses urls with name only', () => {
    const url = LinkUrl.parse('https://specs.apollo.dev/federation')
    expect(url.name).toBe('federation')
    expect(url.version).toBeUndefined()
    expect(url.href).toBe('https://specs.apollo.dev/federation')
  })

  it('stops parsing at invalid versions', () => {
    const url = LinkUrl.parse('https://specs.apollo.dev/federation/v.xxx')
    expect(url.name).toBeUndefined()
    expect(url.version).toBeUndefined()
    expect(url.href).toBe('https://specs.apollo.dev/federation/v.xxx')
  })

  it('does not accept invalid names', () => {
    const url = LinkUrl.parse('https://specs.apollo.dev/federation-/v2.4')
    expect(url.name).toBeUndefined()
    expect(url.version).toEqual({ major: 2, minor: 4 })
    expect(url.href).toBe('https://specs.apollo.dev/federation-/v2.4')
  })

  it('accepts non-http protocols', () => {
    const url = LinkUrl.parse('internal-proto:federation/v2.0')
    expect(url.name).toBe('federation')
    expect(url.version).toEqual({ major: 2, minor: 0 })
    expect(url.href).toBe('internal-proto:federation/v2.0')
  })
})

describe('hgrefs', () => {
  it('are canonicalized', () => {
    expect(HgRef.named('User')).toBe(HgRef.named('User'))
    expect(HgRef.directive('deprecated')).toBe(HgRef.directive('deprecated'))
    expect(HgRef.named('User', 'https://example.com/schema'))
      .toBe(HgRef.named('User', 'https://example.com/schema'))
    expect(HgRef.directive('requires', 'https://example.com/federation/v2.0'))
      .toBe(HgRef.directive('requires', 'https://example.com/federation/v2.0'))
    expect(Term.schema()).toBe(Term.schema())
  })
})

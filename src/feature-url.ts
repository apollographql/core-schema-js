import type { ASTNode, StringValueNode } from 'graphql'

import { URL } from 'url'
import { Version } from './version'
import {err} from './error'

export const ErrNoPath = (url: URL, node?: ASTNode) =>
  err('NoPath', {
    message: `feature url does not have a path: ${url}`,
    url,
    nodes: node ? [node] : undefined
  })

export const ErrNoName = (url: URL, node?: ASTNode) =>
  err('NoName', {
    message: `feature url does not specify a name: ${url}`,
    url,
    nodes: node ? [node] : undefined
  })

export const ErrNoVersion = (url: URL, node?: ASTNode) =>
  err('NoVersion', {
    message: `feature url does not specify a version: ${url}`,
    url,
    nodes: node ? [node] : undefined
  })

export interface ExtSpecifiedBy {
  extensions?: {
    specifiedBy?: string
  }
}

export default class FeatureUrl {
  constructor(
    public readonly identity: string,
    public readonly name: string,
    public readonly version: Version,
    public readonly element?: string,
  ) {}

  /// Parse a spec URL or throw
  public static parse(input: string, node?: ASTNode): FeatureUrl {
    const url = new URL(input)
    if (!url.pathname || url.pathname === '/')
      throw ErrNoPath(url, node)    
    const path = url.pathname.split('/')
    const verStr = path.pop()
    if (!verStr) throw ErrNoVersion(url, node)
    const version = Version.parse(verStr)
    const name = path[path.length - 1]
    if (!name) throw ErrNoName(url, node)
    const element = url.hash ? url.hash.slice(1): undefined
    url.hash = ''
    url.search = ''
    url.password = ''
    url.username = ''
    url.pathname = path.join('/')
    return new FeatureUrl(url.toString(), name, version, element)
  }

  /// Decode a StringValueNode containing a feature url
  public static decode(node: StringValueNode): FeatureUrl {
    return this.parse(node.value, node)
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
    return this.element ?
      `${this.identity}/${this.version}#${this.element}`
      : `${this.identity}/${this.version}`
  }

  get isDirective() {
    return this.element?.startsWith('@')
  }

  get elementName() {
    return this.isDirective ? this.element?.slice(1) : this.element
  }

  get base(): FeatureUrl {
    if (!this.element) return this
    return new FeatureUrl(this.identity, this.name, this.version)
  }

  toString() {
    return this.url
  }
}

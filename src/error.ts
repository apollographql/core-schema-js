import { ASTNode, GraphQLError, printError, Source } from 'graphql'
import { Maybe } from 'graphql/jsutils/Maybe'

export type Props = {
  message: string,
  nodes?: Maybe<ReadonlyArray<ASTNode> | ASTNode>,
  source?: Maybe<Source>,
  positions?: Maybe<ReadonlyArray<number>>,
  path?: Maybe<ReadonlyArray<string | number>>,
  originalError?: Maybe<Error>,
  extensions?: Maybe<{ [key: string]: any }>,
  causes?: Error[]
}

export class GraphQLErrorExt<C extends string> extends GraphQLError {
  static readonly EXCLUDE = new Set('nodes source positions path originalError extensions'.split(' '))

  constructor(public readonly code: C, message: string, props?: Props) {
    super(message,
      props?.nodes,
      props?.source,
      props?.positions,
      props?.path,
      props?.originalError,
      props?.extensions
    )
    if (props) for (const prop in props) {
      if (!GraphQLErrorExt.EXCLUDE.has(prop)) {
        (this as any)[prop] = (props as any)[prop]
      }
    }
  }
  get name() { return this.code }

  throw(): never { throw this }
  toString() {
    let output = `[${this.code}] ${printError(this as any)}`
    const causes = (this as any).causes
    if (causes && causes.length) {
      output += '\ncaused by:'
      for (const cause of (this as any).causes || []) {
        if (!cause) continue
        output += '\n\n  - '
        output += cause.toString().split('\n').join('\n    ')
      }
    }

    return output
  }
}

export function err<C extends string, P extends Props>(code: C, props: P | string): GraphQLErrorExt<C> & P {
  const message = typeof props === 'string' ? props : props.message  
  const error = new GraphQLErrorExt(code, message, typeof props === 'string' ? undefined : props)
  return error as any
}

export default err
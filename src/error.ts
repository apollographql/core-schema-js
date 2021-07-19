import { ASTNode, GraphQLError, Source } from 'graphql'
import { Maybe } from 'graphql/jsutils/Maybe'

export interface GraphQLErrorProps {
  code: string,
  message: string,
  nodes?: Maybe<ReadonlyArray<ASTNode> | ASTNode>,
  source?: Maybe<Source>,
  positions?: Maybe<ReadonlyArray<number>>,
  path?: Maybe<ReadonlyArray<string | number>>,
  originalError?: Maybe<Error>,
  extensions?: Maybe<{ [key: string]: any }>,
}

export function toGraphQLError<P extends GraphQLErrorProps>(props: P | Error): GraphQLError {  
  if (props instanceof Error) return props as GraphQLError
  const localProps: any = {...props}
  if (localProps.cause)
    localProps.cause = toGraphQLError(localProps.cause)
  if (Array.isArray(localProps.causes))
    localProps.causes = localProps.causes.map(toGraphQLError)
  const error = new GraphQLError(
    localProps.message,
    localProps.nodes,
    localProps.source,
    localProps.positions,
    localProps.path,
    localProps.originalError,
    localProps.extensions
  )
  ;(error as any).code = localProps.code
  
  return error
}

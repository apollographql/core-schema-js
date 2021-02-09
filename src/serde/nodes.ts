import type { ASTNode, NullValueNode } from 'graphql'
import type { Maybe } from '../is'
import ERR from '../err'

export const ErrWrongNodeKind = ERR `WrongNodeKind` (
  (props: { expected: string[], node: Maybe<ASTNode> }) =>
    `expected node of type ${props.expected.join(' | ')}, got ${props.node?.kind}`)

export const NullValue = { kind: 'NullValue' as 'NullValue' }
export const isNullNode = (n: any): n is NullValueNode => n.kind === 'NullValue'

import { ValueNode, DirectiveNode, ObjectValueNode } from 'graphql'
import { isAst } from '../is'
import { derive } from '../data'

export type HasMetadata = DirectiveNode | ObjectValueNode

/**
 * Key->ValueNode mapping on object fields or directive arguments.
 */
export const metadata = derive <Map<string, ValueNode>, HasMetadata>
  ('Key value mapping over arguments / fields', target => {
    const args = isAst(target, 'Directive') ? target.arguments : target.fields
    const meta = new Map<string, ValueNode>()
    for (const arg of args ?? []) {
      meta.set(arg.name.value, arg.value)
    }
    return meta
  })


/**
 * Return true iff o can carry metadata (it is a DirectiveNode or
 * ObjectValueNode).
 *
 * @param o input
 */
export const hasMetadata = (o: any): o is HasMetadata =>
  isAst(o, 'Directive', 'ObjectValue')

export default metadata
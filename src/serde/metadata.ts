import { ValueNode, DirectiveNode, ObjectValueNode } from 'graphql'
import { derive } from '../data'

export type HasMetadata = DirectiveNode | ObjectValueNode

/**
 * Key->ValueNode mapping on object fields or directive arguments.
 */
export const metadata = derive <Map<string, ValueNode>, HasMetadata>
  ('Key value mapping over arguments / fields', target => {
    const args = target.kind === 'Directive' ? target.arguments : target.fields
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
export function hasMetadata(o: any): o is HasMetadata {
  const kind = o?.kind
  return kind === 'Directive' || kind === 'ObjectValue'
}

export default metadata
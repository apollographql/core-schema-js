import type { ASTNode } from 'graphql'
import { isNode } from 'graphql/language/ast'
import {pathOf} from '../path'

/**
 * Serialize AST nodes as their document paths, if available, otherwise their kind
 * and position.
 * 
 * This keeps snapshots more readable, as AST nodes typically have a whole
 * subtree attached to them.
 */
export const test = (val: any) => !!pathOf(val) || isNode(val)
export const print = (val: ASTNode) => `${val.kind} <${pathOf(val)?.join('/') ?? (val.loc?.start + '...' + val.loc?.end)}>`

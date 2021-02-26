import type { ASTNode } from 'graphql'
import { isNode } from 'graphql/language/ast'
import {pathOf} from '../linkage'

/**
 * Serialize AST nodes as just their path, if available.
 * 
 * This keeps snapshots more readable, as AST nodes typically have a whole
 * subtree attached to them.
 */
export const test = (val: any) => isNode(val) && !!pathOf(val)
export const print = (val: ASTNode) => `${val.kind} <${pathOf(val)?.join("/")}>`

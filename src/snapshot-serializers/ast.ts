import type { ASTNode } from 'graphql'
import { printLocation } from 'graphql'

/**
 * Serialize AST nodes as a snippet of the source.
 * 
 * This keeps snapshots more readable, as AST nodes typically have a whole
 * subtree attached to them.
 */
export const test = (val: any) => !!val?.loc
export const print = (val: ASTNode) => printLocation(val.loc!)

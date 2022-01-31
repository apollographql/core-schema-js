import { replay } from '@protoplasm/recall'
import { ASTNode, DirectiveNode, DocumentNode, Kind } from 'graphql'
import { isAst } from './is'

export type HasDirectives = DocumentNode | ASTNode & { directives?: DirectiveNode[] }

export const directives = replay(
  function *directives(target: HasDirectives) {
    if (isAst(target, Kind.DOCUMENT)) {
      for (const def of target.definitions) {
        if (def.kind === 'SchemaDefinition' || def.kind === 'SchemaExtension') {          
          if (!def.directives) continue
          yield *def.directives
        }
      }
      return
    }
    if (target.directives) yield *target.directives
  }
)

export default directives
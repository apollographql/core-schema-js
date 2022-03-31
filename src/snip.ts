import { ASTNode, Kind, visit } from "graphql";
import { isLocatable, Locatable } from "./de";
import GRef from "./gref";
import { isAst, hasName } from "./is";
import { toPrefixed } from "./names";
import { IScope } from "./scope";

export class Snip<T extends ASTNode = ASTNode> {  
  static from<T extends ASTNode>(node: T, scope: IScope): Snip<T> {
    return new this(node, scope)
  }

  get gref(): GRef | undefined {
    return isLocatable(this.node) ? this.scope.locate(this.node) : undefined
  }

  locate(node: Locatable): GRef {
    return this.scope.locate(node)
  }

  pasteInto(destScope: IScope): T {
    const sourceScope = this.scope
    return visit(this.node, {
      enter<T extends ASTNode>(node: T, _: any, ): T | null | undefined {
        if (isAst(node, Kind.INPUT_VALUE_DEFINITION)) return
        if (!hasName(node) || !isLocatable(node)) return
        const gref = sourceScope.locate(node)
        const path = destScope.name(gref)
        if (!path) return
        return {
          ...node,
          name: { ...node.name, value: toPrefixed(path) }
        }
      }
    }) as any as T
  }

  private constructor(readonly node: T, readonly scope: IScope) {}
}
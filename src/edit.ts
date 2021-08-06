import { ASTNode, DocumentNode, visit } from 'graphql'
import Core, { Context } from './core'

/**
 * Editors provide a friendly interface to common tree-editing tasks.
 */
export class Editor<C extends Core<DocumentNode>> {
  constructor(public readonly core: C) {}

  delete(...nodes: ASTNode[]) {
    for (const node of nodes)
      this.update(node, DELETE)
  }

  replace(oldNode: ASTNode, newNode: ASTNode) {
    this.update(oldNode, () => newNode)
  }

  merge<N extends ASTNode>(
    named: Map<string, readonly N[]>,
    merge: (name: string, nodes: readonly N[], editor: this) => N | null | undefined): this {   
    for (const [name, definitions] of named) {
      const merged = merge(name, definitions, this)
      if (merged === null) {
        this.delete(...definitions)
        continue
      }
      if (!merged) continue
      const [first, ...rest] = definitions
      if (first) this.replace(first, merged)
      this.delete(...rest)
    }
    return this
  }

  update(node: ASTNode, edit: Edit) {
    const existing = this._edits.get(node)
    if (existing) { existing.push(edit); return this }
    this._edits.set(node, [edit])
    return this
  }  

  get output() {
    const allEdits = this._edits
    return visit(this.core.data, {
      leave(node: ASTNode) {
        const edits = allEdits.get(node)
        if (!edits) return
        return edits.reduce(applyEdit, node)
      }
    })
  }

  apply() {
    return this.core.withData(this.output)
  }


  private _edits: Map<ASTNode, Edit[]> = new Map
}

type Edit = (node: ASTNode) => ASTNode | null

const DELETE = (_: ASTNode) => null

const applyEdit = (node: ASTNode | null, edit: Edit) =>
  node ? edit(node) : null
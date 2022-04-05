import recall, { use } from '@protoplasm/recall'
import { Def, Defs, Redirect } from './de';
import GRef, { byGref } from './gref';
import Schema from './schema';

export interface IAtlas {
  definitions(ref: GRef): Iterable<Def | Redirect>
}

export class Atlas implements IAtlas, Defs {
  @use(recall)
  static fromSchemas(...schemas: Schema[]): Atlas {
    return new this(schemas)
  }

  *definitions(ref?: GRef): Defs {
    if (!ref) return this
    return yield* byGref(...this.schemas).get(ref) ?? []
  }

  *[Symbol.iterator]() {
    for (const schema of this.schemas)
      yield *schema
  }

  constructor(public readonly schemas: Schema[]) {}
}

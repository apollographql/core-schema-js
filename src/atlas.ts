import recall, { use } from '@protoplasm/recall'
import { byRef, Defs } from './de';
import GRef from './gref';
import Schema from './schema';

export class Atlas implements Defs {
  @use(recall)
  static fromSchemas(...schemas: Schema[]): Atlas {
    return new this(schemas)
  }

  *definitions(ref?: GRef): Defs {
    if (!ref) return this
    return yield* byRef(...this.schemas).get(ref) ?? []
  }

  *[Symbol.iterator]() {
    for (const schema of this.schemas)
      yield* schema.definitions()
  }

  constructor(public readonly schemas: Schema[]) {}
}

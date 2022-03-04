import recall, { use } from '@protoplasm/recall'
import { byRef, Defs } from './de';
import GRef from './hgref';
import Schema from './schema';

export interface IAtlas extends Defs {

}

export class Atlas implements IAtlas {
  @use(recall)
  static fromSchemas(...schemas: Schema[]): IAtlas {
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

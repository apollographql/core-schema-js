import recall, { use } from '@protoplasm/recall'
import { byRef, De, Defs } from './de';
import HgRef from './hgref';
import Schema, { Located } from './schema';

interface IAtlas extends Defs {

}

class Atlas implements IAtlas {
  @use(recall)
  static fromSchemas(...schemas: Schema[]): IAtlas {
    return new this(schemas)
  }  

  *definitions(ref?: HgRef): Defs {
    if (ref)
      return yield* byRef(...this.schemas).get(ref) ?? []

    for (const schema of this.schemas)
      yield* schema.definitions()    
  }


  
  
  constructor(public readonly schemas: Schema[]) {}
}
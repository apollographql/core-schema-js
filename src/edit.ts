import type { CoreSchema } from './schema'

/**
 * Edits provide a friendly interface to common tree-editing tasks.
 */
export class Edit {
  constructor(public readonly core: CoreSchema) {}  
}
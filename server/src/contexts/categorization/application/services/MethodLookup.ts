import { type IMethodRepository } from '../../domain/repositories/IMethodRepository.js';
import { MethodId } from '../../domain/value-objects/MethodId.js';

/** See `CategoryLookup` for the rationale; same pattern for `Method`. */
export class MethodLookup {
  constructor(private readonly methods: IMethodRepository) {}

  async isActiveById(rawId: string): Promise<boolean> {
    if (!MethodId.isValid(rawId)) return false;
    const method = await this.methods.findById(MethodId.create(rawId));
    return method !== null && !method.isArchived;
  }
}

import { Method } from '../../domain/entities/Method.js';
import { type IMethodRepository } from '../../domain/repositories/IMethodRepository.js';
import { MethodId } from '../../domain/value-objects/MethodId.js';
import { type ReferenceOption } from './CategoryLookup.js';

/** See `CategoryLookup` for the rationale; same pattern for `Method`. */
export class MethodLookup {
  constructor(private readonly methods: IMethodRepository) {}

  async isActiveById(rawId: string): Promise<boolean> {
    if (!MethodId.isValid(rawId)) return false;
    const method = await this.methods.findById(MethodId.create(rawId));
    return method !== null && !method.isArchived;
  }

  async findIdByName(name: string): Promise<string | null> {
    const normalized = Method.normalizeName(name);
    if (normalized.length === 0) return null;
    const method = await this.methods.findByNormalizedName(normalized);
    if (method === null || method.isArchived) return null;
    return method.id;
  }

  async listActiveOptions(): Promise<readonly ReferenceOption[]> {
    const list = await this.methods.listActive();
    return list.map((m) => ({ id: m.id, name: m.name }));
  }
}

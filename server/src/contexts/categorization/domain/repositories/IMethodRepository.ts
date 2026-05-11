import { type Method } from '../entities/Method.js';
import { type MethodId } from '../value-objects/MethodId.js';

export interface IMethodRepository {
  save(method: Method): Promise<void>;
  saveMany(methods: readonly Method[]): Promise<void>;
  findById(id: MethodId): Promise<Method | null>;
  findByNormalizedName(nameNormalized: string): Promise<Method | null>;
  listAll(): Promise<Method[]>;
  listActive(): Promise<Method[]>;
  nextDisplayOrder(): Promise<number>;
}

import { type Method } from '../../domain/entities/Method.js';
import { type IMethodRepository } from '../../domain/repositories/IMethodRepository.js';

export interface ListMethodsInput {
  readonly includeArchived: boolean;
}

export class ListMethods {
  constructor(private readonly methods: IMethodRepository) {}

  async execute(input: ListMethodsInput): Promise<Method[]> {
    return input.includeArchived ? this.methods.listAll() : this.methods.listActive();
  }
}

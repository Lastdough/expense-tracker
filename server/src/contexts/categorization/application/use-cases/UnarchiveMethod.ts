import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { type Method } from '../../domain/entities/Method.js';
import { MethodId } from '../../domain/value-objects/MethodId.js';
import { MethodNotFoundError } from '../../domain/errors/MethodErrors.js';
import { type IMethodRepository } from '../../domain/repositories/IMethodRepository.js';

export interface UnarchiveMethodInput {
  readonly id: string;
}

export class UnarchiveMethod {
  constructor(private readonly methods: IMethodRepository) {}

  async execute(input: UnarchiveMethodInput): Promise<Result<Method, MethodNotFoundError>> {
    if (!MethodId.isValid(input.id)) {
      return err(new MethodNotFoundError(`Method ${input.id} not found`));
    }
    const method = await this.methods.findById(MethodId.create(input.id));
    if (!method) {
      return err(new MethodNotFoundError(`Method ${input.id} not found`));
    }
    method.unarchive();
    await this.methods.save(method);
    return ok(method);
  }
}

import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { Method } from '../../domain/entities/Method.js';
import { MethodId } from '../../domain/value-objects/MethodId.js';
import {
  DuplicateMethodNameError,
  MethodNotFoundError,
} from '../../domain/errors/MethodErrors.js';
import { type IMethodRepository } from '../../domain/repositories/IMethodRepository.js';

export interface RenameMethodInput {
  readonly id: string;
  readonly newName: string;
}

export class RenameMethod {
  constructor(private readonly methods: IMethodRepository) {}

  async execute(
    input: RenameMethodInput,
  ): Promise<Result<Method, MethodNotFoundError | DuplicateMethodNameError>> {
    if (!MethodId.isValid(input.id)) {
      return err(new MethodNotFoundError(`Method ${input.id} not found`));
    }
    const method = await this.methods.findById(MethodId.create(input.id));
    if (!method) {
      return err(new MethodNotFoundError(`Method ${input.id} not found`));
    }

    const newNormalized = Method.normalizeName(input.newName);
    if (newNormalized !== method.nameNormalized) {
      const clash = await this.methods.findByNormalizedName(newNormalized);
      if (clash) {
        return err(new DuplicateMethodNameError(`Method "${input.newName}" already exists`));
      }
    }

    method.rename(input.newName);
    await this.methods.save(method);
    return ok(method);
  }
}

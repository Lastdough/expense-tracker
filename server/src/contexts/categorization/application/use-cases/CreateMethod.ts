import { randomUUID } from 'node:crypto';
import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { Method } from '../../domain/entities/Method.js';
import { MethodId } from '../../domain/value-objects/MethodId.js';
import { DuplicateMethodNameError } from '../../domain/errors/MethodErrors.js';
import { type IMethodRepository } from '../../domain/repositories/IMethodRepository.js';

export interface CreateMethodInput {
  readonly name: string;
  readonly bgColor: string;
  readonly textColor: string;
}

export class CreateMethod {
  constructor(private readonly methods: IMethodRepository) {}

  async execute(input: CreateMethodInput): Promise<Result<Method, DuplicateMethodNameError>> {
    const nameNormalized = Method.normalizeName(input.name);
    const existing = await this.methods.findByNormalizedName(nameNormalized);
    if (existing) {
      return err(new DuplicateMethodNameError(`Method "${input.name}" already exists`));
    }

    const displayOrder = await this.methods.nextDisplayOrder();
    const method = Method.create({
      id: MethodId.create(randomUUID()),
      name: input.name,
      bgColor: input.bgColor,
      textColor: input.textColor,
      displayOrder,
    });
    await this.methods.save(method);
    return ok(method);
  }
}

import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { type Method } from '../../domain/entities/Method.js';
import { MethodId } from '../../domain/value-objects/MethodId.js';
import {
  MethodNotFoundError,
  MethodReorderMismatchError,
} from '../../domain/errors/MethodErrors.js';
import { type IMethodRepository } from '../../domain/repositories/IMethodRepository.js';

export interface ReorderMethodsInput {
  readonly ids: readonly string[];
}

export class ReorderMethods {
  constructor(private readonly methods: IMethodRepository) {}

  async execute(
    input: ReorderMethodsInput,
  ): Promise<Result<Method[], MethodNotFoundError | MethodReorderMismatchError>> {
    if (new Set(input.ids).size !== input.ids.length) {
      return err(new MethodReorderMismatchError('Reorder list contains duplicate ids'));
    }

    for (const raw of input.ids) {
      if (!MethodId.isValid(raw)) {
        return err(new MethodReorderMismatchError(`"${raw}" is not a valid method id`));
      }
    }
    const brandedIds = input.ids.map((raw) => MethodId.create(raw));

    const active = await this.methods.listActive();
    const activeIds = new Set(active.map((m) => m.id as string));

    if (brandedIds.length !== activeIds.size) {
      return err(
        new MethodReorderMismatchError(
          `Reorder list must contain exactly the ${activeIds.size} active methods; got ${brandedIds.length}`,
        ),
      );
    }

    for (const id of brandedIds) {
      if (!activeIds.has(id)) {
        return err(new MethodNotFoundError(`Method ${id} is not active or does not exist`));
      }
    }

    const byId = new Map(active.map((m) => [m.id as string, m] as const));
    const reordered: Method[] = [];
    brandedIds.forEach((id, index) => {
      const method = byId.get(id);
      if (!method) return;
      method.reorderTo(index);
      reordered.push(method);
    });

    await this.methods.saveMany(reordered);
    return ok(reordered);
  }
}

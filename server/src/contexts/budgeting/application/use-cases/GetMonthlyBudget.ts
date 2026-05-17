import { ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { type MonthlyBudget } from '../../domain/entities/MonthlyBudget.js';
import { type IMonthlyBudgetRepository } from '../../domain/repositories/IMonthlyBudgetRepository.js';

export interface GetMonthlyBudgetOutput {
  readonly budget: MonthlyBudget | null;
}

export class GetMonthlyBudget {
  constructor(private readonly repo: IMonthlyBudgetRepository) {}

  async execute(): Promise<Result<GetMonthlyBudgetOutput, never>> {
    const budget = await this.repo.get();
    return ok({ budget });
  }
}

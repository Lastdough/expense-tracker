import { DomainError } from '../../../../shared-kernel/errors/DomainError.js';
import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { type Reimbursement } from '../../domain/entities/Reimbursement.js';
import { type IReimbursementRepository } from '../../domain/repositories/IReimbursementRepository.js';

export class InvalidDateRangeError extends DomainError {
  readonly code = 'invalid_date_range';
}

export interface ListUnpaidReimbursablesInput {
  readonly dateStart: Date;
  readonly dateEnd: Date;
}

export interface ListUnpaidReimbursablesOutput {
  readonly items: readonly Reimbursement[];
}

export class ListUnpaidReimbursables {
  constructor(private readonly reimbursements: IReimbursementRepository) {}

  async execute(
    input: ListUnpaidReimbursablesInput,
  ): Promise<Result<ListUnpaidReimbursablesOutput, InvalidDateRangeError>> {
    if (
      !(input.dateStart instanceof Date) ||
      Number.isNaN(input.dateStart.getTime()) ||
      !(input.dateEnd instanceof Date) ||
      Number.isNaN(input.dateEnd.getTime())
    ) {
      return err(new InvalidDateRangeError('dateStart and dateEnd must be valid Dates'));
    }
    if (input.dateStart.getTime() >= input.dateEnd.getTime()) {
      return err(new InvalidDateRangeError('dateStart must be before dateEnd'));
    }
    const items = await this.reimbursements.findUnpaidReimbursables({
      start: input.dateStart,
      end: input.dateEnd,
    });
    return ok({ items });
  }
}

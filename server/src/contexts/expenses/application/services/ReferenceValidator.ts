import { err, ok, type Result } from '../../../../shared-kernel/result/Result.js';
import { type CategoryLookup } from '../../../categorization/application/services/CategoryLookup.js';
import { type MethodLookup } from '../../../categorization/application/services/MethodLookup.js';
import { type ReimbursementStatusLookup } from '../../../categorization/application/services/ReimbursementStatusLookup.js';
import { ReferenceNotFoundError } from '../../domain/errors/ExpenseErrors.js';
import { CategoryRef } from '../../domain/value-objects/CategoryRef.js';
import { MethodRef } from '../../domain/value-objects/MethodRef.js';
import { ReimbursementStatusRef } from '../../domain/value-objects/ReimbursementStatusRef.js';

export interface ReferenceTriple {
  readonly categoryId: string;
  readonly methodId: string;
  readonly reimbursementStatusId: string;
}

export interface ValidatedReferenceTriple {
  readonly categoryId: CategoryRef;
  readonly methodId: MethodRef;
  readonly reimbursementStatusId: ReimbursementStatusRef;
}

/**
 * Cross-aggregate gatekeeper for the three FK refs an Expense carries.
 * Centralises the rule (CLAUDE.md): archived rows are valid for *existing*
 * expenses but never assignable to new or edited ones. Cross-context calls
 * go application → application via the three `*Lookup` services. The first
 * failure short-circuits — order is `categoryId → methodId → reimbursementStatusId`.
 */
export class ReferenceValidator {
  constructor(
    private readonly categoryLookup: CategoryLookup,
    private readonly methodLookup: MethodLookup,
    private readonly statusLookup: ReimbursementStatusLookup,
  ) {}

  async assertActive(
    triple: ReferenceTriple,
  ): Promise<Result<ValidatedReferenceTriple, ReferenceNotFoundError>> {
    if (!CategoryRef.isValid(triple.categoryId)) {
      return err(new ReferenceNotFoundError('categoryId', triple.categoryId));
    }
    if (!(await this.categoryLookup.isActiveById(triple.categoryId))) {
      return err(new ReferenceNotFoundError('categoryId', triple.categoryId));
    }

    if (!MethodRef.isValid(triple.methodId)) {
      return err(new ReferenceNotFoundError('methodId', triple.methodId));
    }
    if (!(await this.methodLookup.isActiveById(triple.methodId))) {
      return err(new ReferenceNotFoundError('methodId', triple.methodId));
    }

    if (!ReimbursementStatusRef.isValid(triple.reimbursementStatusId)) {
      return err(
        new ReferenceNotFoundError('reimbursementStatusId', triple.reimbursementStatusId),
      );
    }
    if (!(await this.statusLookup.isActiveById(triple.reimbursementStatusId))) {
      return err(
        new ReferenceNotFoundError('reimbursementStatusId', triple.reimbursementStatusId),
      );
    }

    return ok({
      categoryId: CategoryRef.create(triple.categoryId),
      methodId: MethodRef.create(triple.methodId),
      reimbursementStatusId: ReimbursementStatusRef.create(triple.reimbursementStatusId),
    });
  }

  async assertOneActive<TField extends keyof ReferenceTriple>(
    field: TField,
    rawId: string,
  ): Promise<Result<ValidatedReferenceTriple[TField], ReferenceNotFoundError>> {
    if (field === 'categoryId') {
      if (!CategoryRef.isValid(rawId)) {
        return err(new ReferenceNotFoundError('categoryId', rawId));
      }
      if (!(await this.categoryLookup.isActiveById(rawId))) {
        return err(new ReferenceNotFoundError('categoryId', rawId));
      }
      return ok(CategoryRef.create(rawId) as ValidatedReferenceTriple[TField]);
    }
    if (field === 'methodId') {
      if (!MethodRef.isValid(rawId)) {
        return err(new ReferenceNotFoundError('methodId', rawId));
      }
      if (!(await this.methodLookup.isActiveById(rawId))) {
        return err(new ReferenceNotFoundError('methodId', rawId));
      }
      return ok(MethodRef.create(rawId) as ValidatedReferenceTriple[TField]);
    }
    // reimbursementStatusId
    if (!ReimbursementStatusRef.isValid(rawId)) {
      return err(new ReferenceNotFoundError('reimbursementStatusId', rawId));
    }
    if (!(await this.statusLookup.isActiveById(rawId))) {
      return err(new ReferenceNotFoundError('reimbursementStatusId', rawId));
    }
    return ok(ReimbursementStatusRef.create(rawId) as ValidatedReferenceTriple[TField]);
  }
}

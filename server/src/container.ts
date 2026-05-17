// Composition root.
//
// The ONE place in the codebase where concrete classes are instantiated and
// wired. Everything else takes its collaborators via constructor injection,
// keeping the rest of the code unaware of which database, ORM, or transport
// is in use.
//
// Per CLAUDE.md: PrismaClient construction lives here (the composition root),
// never inside contexts/*/domain or contexts/*/application.

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { InMemoryEventBus } from './shared-kernel/domain-events/InMemoryEventBus.js';
import { type EventBus } from './shared-kernel/domain-events/EventBus.js';
import { type AppConfig } from './config/env.js';

// Categorization context
import { CreateCategory } from './contexts/categorization/application/use-cases/CreateCategory.js';
import { RenameCategory } from './contexts/categorization/application/use-cases/RenameCategory.js';
import { ChangeCategoryColors } from './contexts/categorization/application/use-cases/ChangeCategoryColors.js';
import { ArchiveCategory } from './contexts/categorization/application/use-cases/ArchiveCategory.js';
import { UnarchiveCategory } from './contexts/categorization/application/use-cases/UnarchiveCategory.js';
import { ReorderCategories } from './contexts/categorization/application/use-cases/ReorderCategories.js';
import { ListCategories } from './contexts/categorization/application/use-cases/ListCategories.js';
import { PrismaCategoryRepository } from './contexts/categorization/infrastructure/persistence/prisma/PrismaCategoryRepository.js';

import { CreateMethod } from './contexts/categorization/application/use-cases/CreateMethod.js';
import { RenameMethod } from './contexts/categorization/application/use-cases/RenameMethod.js';
import { ChangeMethodColors } from './contexts/categorization/application/use-cases/ChangeMethodColors.js';
import { ArchiveMethod } from './contexts/categorization/application/use-cases/ArchiveMethod.js';
import { UnarchiveMethod } from './contexts/categorization/application/use-cases/UnarchiveMethod.js';
import { ReorderMethods } from './contexts/categorization/application/use-cases/ReorderMethods.js';
import { ListMethods } from './contexts/categorization/application/use-cases/ListMethods.js';
import { PrismaMethodRepository } from './contexts/categorization/infrastructure/persistence/prisma/PrismaMethodRepository.js';

import { CreateReimbursementStatus } from './contexts/categorization/application/use-cases/CreateReimbursementStatus.js';
import { RenameReimbursementStatus } from './contexts/categorization/application/use-cases/RenameReimbursementStatus.js';
import { ChangeReimbursementStatusColors } from './contexts/categorization/application/use-cases/ChangeReimbursementStatusColors.js';
import { ArchiveReimbursementStatus } from './contexts/categorization/application/use-cases/ArchiveReimbursementStatus.js';
import { UnarchiveReimbursementStatus } from './contexts/categorization/application/use-cases/UnarchiveReimbursementStatus.js';
import { ReorderReimbursementStatuses } from './contexts/categorization/application/use-cases/ReorderReimbursementStatuses.js';
import { ListReimbursementStatuses } from './contexts/categorization/application/use-cases/ListReimbursementStatuses.js';
import { PrismaReimbursementStatusRepository } from './contexts/categorization/infrastructure/persistence/prisma/PrismaReimbursementStatusRepository.js';

import {
  makeReferenceController,
  type ReferenceController,
} from './contexts/categorization/interfaces/http/controllers/makeReferenceController.js';

// Categorization application-layer lookups (cross-context boundary)
import { CategoryLookup } from './contexts/categorization/application/services/CategoryLookup.js';
import { MethodLookup } from './contexts/categorization/application/services/MethodLookup.js';
import { ReimbursementStatusLookup } from './contexts/categorization/application/services/ReimbursementStatusLookup.js';

// Expenses context
import { ReferenceValidator } from './contexts/expenses/application/services/ReferenceValidator.js';
import { DeleteExpense } from './contexts/expenses/application/use-cases/DeleteExpense.js';
import { EditExpense } from './contexts/expenses/application/use-cases/EditExpense.js';
import { GetExpense } from './contexts/expenses/application/use-cases/GetExpense.js';
import { ListExpenses } from './contexts/expenses/application/use-cases/ListExpenses.js';
import { RecordExpense } from './contexts/expenses/application/use-cases/RecordExpense.js';
import { PrismaExpenseRepository } from './contexts/expenses/infrastructure/persistence/prisma/PrismaExpenseRepository.js';
import {
  makeExpenseController,
  type ExpenseController,
} from './contexts/expenses/interfaces/http/controllers/ExpenseController.js';
import {
  ExpenseDeleted,
  ExpenseRecorded,
} from './contexts/expenses/application/events/index.js';

// Reimbursements context
import { ReimbursementStatusKindLookup } from './contexts/categorization/application/services/ReimbursementStatusKindLookup.js';
import { GetReimbursement } from './contexts/reimbursements/application/use-cases/GetReimbursement.js';
import { GetReimbursementByExpense } from './contexts/reimbursements/application/use-cases/GetReimbursementByExpense.js';
import { ListUnpaidReimbursables } from './contexts/reimbursements/application/use-cases/ListUnpaidReimbursables.js';
import { MarkAsEarly } from './contexts/reimbursements/application/use-cases/MarkAsEarly.js';
import { MarkAsNonReimbursable } from './contexts/reimbursements/application/use-cases/MarkAsNonReimbursable.js';
import { MarkAsPaid } from './contexts/reimbursements/application/use-cases/MarkAsPaid.js';
import { MarkAsPending } from './contexts/reimbursements/application/use-cases/MarkAsPending.js';
import { MarkAsUnpaid } from './contexts/reimbursements/application/use-cases/MarkAsUnpaid.js';
import { CreateReimbursementOnExpenseRecorded } from './contexts/reimbursements/application/event-handlers/CreateReimbursementOnExpenseRecorded.js';
import { DeleteReimbursementOnExpenseDeleted } from './contexts/reimbursements/application/event-handlers/DeleteReimbursementOnExpenseDeleted.js';
import { PrismaReimbursementRepository } from './contexts/reimbursements/infrastructure/persistence/prisma/PrismaReimbursementRepository.js';
import {
  makeReimbursementController,
  type ReimbursementController,
} from './contexts/reimbursements/interfaces/http/controllers/makeReimbursementController.js';

export interface Container {
  readonly eventBus: EventBus;
  readonly categoryController: ReferenceController;
  readonly methodController: ReferenceController;
  readonly reimbursementStatusController: ReferenceController;
  readonly expenseController: ExpenseController;
  readonly reimbursementController: ReimbursementController;
  shutdown(): Promise<void>;
}

export async function buildContainer(config: AppConfig): Promise<Container> {
  const prisma = createPrismaClient(config);
  const eventBus: EventBus = new InMemoryEventBus();

  // Categorization — Category
  const categoryRepo = new PrismaCategoryRepository(prisma);
  const categoryController = makeReferenceController({
    list: new ListCategories(categoryRepo),
    create: new CreateCategory(categoryRepo),
    rename: new RenameCategory(categoryRepo),
    changeColors: new ChangeCategoryColors(categoryRepo),
    archive: new ArchiveCategory(categoryRepo),
    unarchive: new UnarchiveCategory(categoryRepo),
    reorder: new ReorderCategories(categoryRepo),
  });

  // Categorization — Method
  const methodRepo = new PrismaMethodRepository(prisma);
  const methodController = makeReferenceController({
    list: new ListMethods(methodRepo),
    create: new CreateMethod(methodRepo),
    rename: new RenameMethod(methodRepo),
    changeColors: new ChangeMethodColors(methodRepo),
    archive: new ArchiveMethod(methodRepo),
    unarchive: new UnarchiveMethod(methodRepo),
    reorder: new ReorderMethods(methodRepo),
  });

  // Categorization — ReimbursementStatus
  const reimbursementStatusRepo = new PrismaReimbursementStatusRepository(prisma);
  const reimbursementStatusController = makeReferenceController({
    list: new ListReimbursementStatuses(reimbursementStatusRepo),
    create: new CreateReimbursementStatus(reimbursementStatusRepo),
    rename: new RenameReimbursementStatus(reimbursementStatusRepo),
    changeColors: new ChangeReimbursementStatusColors(reimbursementStatusRepo),
    archive: new ArchiveReimbursementStatus(reimbursementStatusRepo),
    unarchive: new UnarchiveReimbursementStatus(reimbursementStatusRepo),
    reorder: new ReorderReimbursementStatuses(reimbursementStatusRepo),
  });

  // Expenses
  const expenseRepo = new PrismaExpenseRepository(prisma);
  const referenceValidator = new ReferenceValidator(
    new CategoryLookup(categoryRepo),
    new MethodLookup(methodRepo),
    new ReimbursementStatusLookup(reimbursementStatusRepo),
  );
  const expenseController = makeExpenseController({
    record: new RecordExpense(expenseRepo, referenceValidator, eventBus),
    list: new ListExpenses(expenseRepo),
    get: new GetExpense(expenseRepo),
    edit: new EditExpense(expenseRepo, referenceValidator, eventBus),
    delete: new DeleteExpense(expenseRepo, eventBus),
  });

  // Reimbursements
  const reimbursementRepo = new PrismaReimbursementRepository(prisma);
  const reimbursementStatusKindLookup = new ReimbursementStatusKindLookup(reimbursementStatusRepo);
  const reimbursementController = makeReimbursementController({
    get: new GetReimbursement(reimbursementRepo),
    getByExpense: new GetReimbursementByExpense(reimbursementRepo),
    listUnpaid: new ListUnpaidReimbursables(reimbursementRepo),
    markPaid: new MarkAsPaid(reimbursementRepo, eventBus),
    markPending: new MarkAsPending(reimbursementRepo, eventBus),
    markEarly: new MarkAsEarly(reimbursementRepo, eventBus),
    markUnpaid: new MarkAsUnpaid(reimbursementRepo, eventBus),
    markNonReimbursable: new MarkAsNonReimbursable(reimbursementRepo, eventBus),
  });

  // Auto-create / cleanup Reimbursement on Expense lifecycle.
  const createReimbursementHandler = new CreateReimbursementOnExpenseRecorded(
    reimbursementRepo,
    reimbursementStatusKindLookup,
    eventBus,
  );
  const deleteReimbursementHandler = new DeleteReimbursementOnExpenseDeleted(
    reimbursementRepo,
    eventBus,
  );
  const unsubscribers = [
    eventBus.subscribe(ExpenseRecorded.type, (e) =>
      createReimbursementHandler.handle(e as ExpenseRecorded),
    ),
    eventBus.subscribe(ExpenseDeleted.type, (e) =>
      deleteReimbursementHandler.handle(e as ExpenseDeleted),
    ),
  ];

  return {
    eventBus,
    categoryController,
    methodController,
    reimbursementStatusController,
    expenseController,
    reimbursementController,
    async shutdown() {
      for (const unsubscribe of unsubscribers) unsubscribe();
      await prisma.$disconnect();
    },
  };
}

function createPrismaClient(config: AppConfig): PrismaClient {
  switch (config.databaseProvider) {
    case 'sqlite': {
      const adapter = new PrismaBetterSqlite3({ url: config.databaseUrl });
      return new PrismaClient({ adapter });
    }
    case 'postgres': {
      const adapter = new PrismaPg(config.databaseUrl);
      return new PrismaClient({ adapter });
    }
  }
}

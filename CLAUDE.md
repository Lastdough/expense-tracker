# CLAUDE.md

This file is the source of truth for **architectural rules and conventions** in this project. Read this on every session before making any changes. For roadmap and current status, see `PLAN.md`.

---

## Project overview

A personal-finance ledger application. Starts as an expense tracker (replacing a Google Sheets + Form workflow) and grows into a full ledger that tracks Assets, Liabilities, Equity, and Expenses. Single-user initially, multi-user later.

---

## Tech stack (locked)

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, motion/react, react-router-dom v7, lucide-react, Google Material Symbols icon font
- **Backend:** Express, TypeScript via tsx, Prisma v7 ORM, dotenv
- **DB (dev):** SQLite via `@prisma/adapter-better-sqlite3`
- **DB (prod):** PostgreSQL
- **Testing:** Vitest
- **Validation:** Zod (at HTTP boundaries only)

Do not introduce other major dependencies without justification in a discussion turn first.

---

## Architecture: Domain-Driven Design

This is a DDD project. Code organization follows **bounded contexts** with strict layer separation inside each context.

### Bounded contexts

Even if a context isn't implemented yet, its folder exists as a placeholder once it's been named.

| Context | Responsibility |
|---|---|
| `expenses` | Recording, editing, listing expense entries. The first context built. |
| `categorization` | Reference data: Category, Method, ReimbursementStatus. |
| `reimbursements` | Lifecycle of reimbursable expenses (Unpaid → Paid, Early, Pending). |
| `budgeting` | Budgets per category per period. |
| `reporting` | Read-only projections: charts, summaries, receipt export, net-owed calculations. |
| `ledger` | Future. Accounts (Assets/Liabilities/Equity), double-entry transactions. |
| `identity` | Future (Phase 2). Users, sessions, auth. |

### Cross-context rules

- A context's `application` layer **may** call another context's `application` layer.
- A context **must not** reach into another context's `domain` or `infrastructure`.
- Preferred cross-context communication: domain events on the in-memory event bus.
- The `shared-kernel` is the only thing every context may depend on.

---

## Folder structure

```
/
├── server/                       # Backend workspace
│   ├── src/
│   │   ├── shared-kernel/
│   │   │   ├── money/            # Money value object
│   │   │   ├── identifier/       # Branded ID types
│   │   │   ├── result/           # Result<T, E>
│   │   │   └── domain-events/    # Event bus interface + in-memory impl
│   │   ├── contexts/
│   │   │   └── <context-name>/
│   │   │       ├── domain/
│   │   │       │   ├── entities/         # Aggregate roots
│   │   │       │   ├── value-objects/
│   │   │       │   ├── repositories/     # Interfaces only
│   │   │       │   ├── services/         # Pure domain services
│   │   │       │   ├── events/
│   │   │       │   └── errors/
│   │   │       ├── application/
│   │   │       │   ├── use-cases/
│   │   │       │   └── dto/
│   │   │       ├── infrastructure/
│   │   │       │   ├── persistence/
│   │   │       │   │   ├── prisma/       # Prisma-backed repos
│   │   │       │   └── mappers/
│   │   │       └── interfaces/
│   │   │           └── http/
│   │   │               ├── controllers/
│   │   │               ├── routes/
│   │   │               └── schemas/      # Zod
│   │   ├── config/
│   │   ├── container.ts          # Composition root
│   │   └── server.ts             # Express + Vite middleware setup
│   ├── prisma/
│   │   ├── schema.sqlite.prisma
│   │   └── schema.postgres.prisma
│   └── package.json
├── client/                       # Frontend workspace
│   ├── src/
│   └── package.json
├── docs/
│   └── domain/                   # One markdown file per bounded context
├── CLAUDE.md
├── PLAN.md
├── Dockerfile.api
├── Dockerfile.web
├── Dockerfile.monolith
├── docker-compose.yml
└── package.json                  # Workspace root
```

---

## The Dependency Rule (non-negotiable)

Inside any bounded context, dependencies point **inward only**:

```
interfaces ──┐
             ├──► application ──► domain
infrastructure ──┘
```

- `domain/` imports from nothing except `shared-kernel/` and other files inside its own `domain/`.
- `application/` imports from its own `domain/` and `shared-kernel/`. Nothing else.
- `infrastructure/` may import from its own `domain/` and `shared-kernel/`.
- `interfaces/` may import from its own `application/` and `shared-kernel/`.
- **Nothing** in `domain/` or `application/` may import from `@prisma/client`, `express`, `zod`, or any infrastructure concern. If you need a type, define it in the domain.

Enforce this with `dependency-cruiser` or `eslint-plugin-boundaries`. CI fails if violated.

### Why so strict?

Production target is Postgres but dev is SQLite, and the long-term plan keeps the door open for another store. The ONLY way that swap is cheap is if the Service layer never knows what's underneath. The Repository interface is the swap point — Prisma is one implementation among possible others.

---

## Mandatory patterns

### Repository pattern

- Every aggregate has an interface in `domain/repositories/I<Aggregate>Repository.ts`.
- Concrete implementations live in `infrastructure/persistence/<technology>/`.
- Repositories return **domain objects**, never Prisma types. Mappers handle the translation.
- Repository methods speak the domain's language: `findUnpaidReimbursables(dateRange)`, not `findManyByStatusEqualsString(...)`.

### Use cases (application services)

- One use case per file. One public method, conventionally named `execute`.
- Use cases receive their dependencies via constructor injection.
- Use cases return `Result<T, DomainError>` rather than throwing for expected failures. Throwing is reserved for programmer errors / invariant violations.

### DTOs at boundaries

- HTTP request bodies are validated with Zod, then mapped to a DTO.
- DTOs feed into use cases.
- Use cases return domain objects or projections; controllers serialize them to JSON.
- A Prisma object must never be serialized directly to a response. A domain object must never be passed directly to `res.json` either — go through a serializer.

### Composition root

- `src/container.ts` is the **only** place where concrete classes are instantiated and wired.
- Every other file receives its dependencies as constructor parameters.
- No service-locator pattern, no globals, no `import { db } from '../db'` shortcuts.
- Lightweight manual DI — no DI framework needed.

### Domain events

- Defined in `<context>/domain/events/`.
- Published from aggregates (added to an internal list, flushed by the use case after persistence succeeds).
- Subscribed to in `<context>/application/` or in another context's `application/` layer.
- In-memory bus for now. Interface stays clean enough to swap for a real broker later.

---

## Critical domain rules

These are the invariants that make this app *correct*. Violating them is a bug regardless of test results.

### Money

- All monetary values use the `Money` value object from `shared-kernel/money/`.
- Internally: `{ amount: bigint, currency: 'IDR' | ... }` where `amount` is in **integer minor units**.
- **Never use `number` for money. Never use floating-point arithmetic on money.**
- All arithmetic happens via `Money` methods (`add`, `subtract`, `multiply`, `negate`).
- Operations across currencies throw. Currency conversion is an explicit, separate concern.
- Default currency is IDR (Indonesian Rupiah), Changeable in Settings

### Formula evaluation (security-critical)

Users can input formulas like `=20000*5` or `=99000-81000`. Both the raw input and the evaluated result must be stored.

- **NEVER use `eval()`, `new Function()`, `vm.runInNewContext()`, or any dynamic code execution.** This rule has no exceptions.
- Use a sandboxed expression parser (`expr-eval` or hand-rolled shunting-yard).
- Whitelist the input character set with a regex BEFORE parsing: digits, `+ - * / ( ) .`, whitespace.
- Reject any input that fails the whitelist with a domain error.
- The evaluator is a pure domain service in `expenses/domain/services/FormulaEvaluator.ts`. Fully unit-tested.
- The `Expense` aggregate stores `rawInput: string | null` (`"=20000*5"`) AND `amount: Money` (the resolved 100000 IDR). The amount is the source of truth for all math; raw is for display/edit.

### Reimbursement state machine

`Reimbursement` is a value object with these states:

- `NonReimbursable`
- `UnpaidReimbursable`
- `PaidReimbursable { paidAt: Date }`
- `EarlyReimbursement { receivedAt: Date }`
- `PendingReimbursement`


`PaidReimbursable` is basically balanced(zero) its only there for recording the transaction. 

Legal transitions are encoded in the value object. Illegal transitions return an error, never silently succeed.

`netOwed` and `availableBudget`:

- `netOwed = sum(|Early|) – sum(Unpaid)` (positive means money is owed *to* the user)
- `availableBudget = monthlyBudget – netOwed`
- Computed in the `reporting` context, NOT on the Expense aggregate. They're cross-aggregate calculations.

### Expenses are always positive

An Expense's `amount` is always the absolute cost. The sign in reports is derived from reimbursement state. **Never store a negative amount on an Expense to represent an Early reimbursement.** That confusion is exactly what the state machine exists to prevent.

### Reference data uses archive, not delete

Categories, Methods, and ReimbursementStatuses are referenced by historical expenses. Deleting them would orphan data.

- Archive instead of delete (`isArchived: boolean`).
- Archived items hide from creation dropdowns but still render correctly on old expenses.
- A "show archived" toggle is allowed in the settings UI.

---

## Reference data — initial seeds

Seed these on first run. Colors are exact and must match.

### Categories

| Name | bgColor | textColor |
|---|---|---|
| Food | `#ffcfc9` | `#b10202` |
| Transportations | `#0a53a8` | `#ffffff` |
| Shopping | `#e6cff2` | `#5a3286` |
| Supplies | `#e6cff2` | `#5a3286` |
| Groceries | `#e6cff2` | `#5a3286` |
| Bill | `#ffe5a0` | `#473821` |
| Services | `#ffe5a0` | `#473821` |
| Entertainment | `#ffe5a0` | `#473821` |
| Healthcare | `#d4edbc` | `#11734b` |
| Misc | `#e8eaed` | `#000000` |

### Methods

| Name | bgColor | textColor |
|---|---|---|
| Mandiri | `#143361` | `#a8c0e0` |
| Jago | `#fcaf23` | `#6b4400` |
| BCA | `#046ebc` | `#c0d8f5` |
| Gopay | `#00accb` | `#e0f7ff` |
| ShopeePay | `#ef5334` | `#ffffff` |
| Cash | `#e8eaed` | `#000000` |

### Reimbursement statuses

| Name | bgColor | textColor |
|---|---|---|
| Non-Reimbursable | `#e8eaed` | `#000000` |
| Unpaid Reimbursable | `#ffe5a0` | `#473821` |
| Paid Reimbursable | `#d4edbc` | `#11734b` |
| Early Reimbursement | `#bce3f2` | `#0b4c6b` |
| Pending Reimbursement | `#ffc8aa` | `#753800` |

---

## Frontend conventions

- React 19 with the new compiler. Avoid premature `useMemo`/`useCallback` — let the compiler do its job.
- Tailwind v4 only. No CSS modules, no styled-components.
- All API calls go through a typed client in `client/src/api/`. The client reads `VITE_API_URL` (empty = same origin).
- Routing via `react-router-dom` v7 file-organized in `client/src/routes/`.
- Forms: prefer uncontrolled inputs + Zod validation on submit. Use a small wrapper around `react-hook-form` only if needed.
- Animations via `motion/react`, used sparingly and purposefully.
- Icons: `lucide-react` first; Google Material Symbols only when lucide lacks a fitting icon.

### The Quick-Add screen is sacred

This is the daily driver and the reason this app exists at all. Performance and ergonomics here outweigh every other UI consideration.

- Mobile-first.
- Field order: Amount → Category → Method → Description → Reimbursement (default `Non-Reimbursable`) → Date (default today).
- Amount field accepts formulas; live-evaluate with debouncing; show the resolved value next to the input.
- Submit on Enter from the description field; reset and refocus Amount.
- Per-field "last used" memory, restored on next visit.

---

## Deployment modes

The app supports two deploy modes from a single codebase:

1. **Coupled (monolith):** Express serves the built React app as static files. Single container.
2. **Decoupled:** Express runs as an API-only server; React is served separately (nginx). Two containers.

How this is wired:
- `client/` is a fully independent Vite project — its own `package.json`, builds to `client/dist/`.
- In dev, `server.ts` mounts Vite as middleware (your existing pattern).
- In prod, `server.ts` checks `SERVE_FRONTEND` env var. If `true`, serves `client/dist`. If `false`, doesn't.
- Frontend reads `VITE_API_URL`. Empty = same origin (coupled mode); populated = absolute URL (decoupled mode).
- CORS configured from day one even when not needed yet.
- Three Dockerfiles: `Dockerfile.api`, `Dockerfile.web`, `Dockerfile.monolith`.

---

## Testing conventions

- Domain logic: pure unit tests with Vitest. Inject fakes; never touch the DB.
- Use cases: unit tests with fake repository implementations.
- Repository implementations: integration tests against a real (in-memory or temp file) SQLite.
- HTTP layer: integration tests with supertest, hitting the wired Express app with fake or real repos.
- Coverage targets are guidelines, not gates. **Coverage on the domain layer should approach 100%.** Coverage on infrastructure/interfaces matters less.

---

## What "done" looks like for any task

A task is done when:

1. The dependency rule is not violated (lint passes).
2. New domain logic has unit tests.
3. New use cases have unit tests with fake repos.
4. The change does not introduce any `eval`, `Function`, `any`, or `as unknown as` casts (search before committing).
5. No Prisma types appear outside `infrastructure/persistence/prisma/`.
6. Money values are not represented as `number` anywhere.
7. The Expense (or relevant aggregate) is not bypassed for a direct DB write.

---

## Conventions for working with Claude Code

- Always read `PLAN.md` to know the current milestone before starting work.
- For any non-trivial change, propose a plan first; wait for user confirmation before writing files.
- Ask the user before adding a dependency.
- Keep diffs small and focused. One milestone deliverable per PR/session.
- After completing a deliverable, update `PLAN.md` to check it off.
- If a rule in this file is wrong or outdated, update the file in the same change as the code.

# PLAN.md

The roadmap. For architectural rules, see `CLAUDE.md`.

**Current milestone:** Phase 1 / Milestone H — Reporting context (Milestone G complete: Reimbursement state machine, aggregate, 5 transition + 3 read use cases, HTTP, events, auto-create on ExpenseRecorded)
**Last updated:** 2026-05-17

---

## Goals, in order

1. **Replace Google Sheets** as the daily expense-tracking tool. Single user, no auth.
2. **Lay clean DDD foundations** so the app can grow into a full personal-finance ledger without rewrites.
3. **Add auth and multi-user.**
4. **Expand into ledger features** (Assets / Liabilities / Equity / Expenses with double-entry).
5. **Quality-of-life features:** charts, budgets, recurring expenses, receipt OCR, etc.

---

## Phase 0 — Scaffolding

Foundation that every later feature drops into.

### Milestone A — Workspace and skeleton

- [x] Init git repo, root `package.json` with workspaces (`server`, `client`)
- [x] `server/` with TypeScript, tsx, Express, dotenv configured
- [x] `client/` with Vite, React 19, TypeScript, Tailwind v4, react-router v7, motion/react, lucide-react
- [x] `server.ts` runs Express with Vite as middleware in dev, static-serves `client/dist` in prod (gated by `SERVE_FRONTEND` env var)
- [x] Folder structure from CLAUDE.md created (empty placeholders for each context)
- [x] `dependency-cruiser` (or `eslint-plugin-boundaries`) configured to enforce the dependency rule; CI fails on violations
- [x] Three Dockerfiles (`Dockerfile.api`, `Dockerfile.web`, `Dockerfile.monolith`) + `docker-compose.yml` with `decoupled` / `monolith` profiles, both verified end-to-end against the compose Postgres
- [x] `.env.example` and config loader in `server/src/config/`

### Milestone B — Shared kernel

- [x] `Money` value object with full unit tests (add, subtract, multiply, negate, format, currency mismatch errors, integer overflow safety with bigint)
- [x] Branded ID types (`ExpenseId`, `CategoryId`, etc.)
- [x] `Result<T, E>` type with helpers (`ok`, `err`, `map`, `flatMap`)
- [x] Domain event bus interface + in-memory implementation
- [x] Base `DomainError` class

### Milestone C — Persistence wiring

- [x] Prisma installed with `@prisma/adapter-better-sqlite3`
- [x] `prisma/sqlite/schema.prisma` and `prisma/postgres/schema.prisma` (subfolder layout — see decisions log 2026-05-11)
- [x] `prisma.config.ts` (new in Prisma 7) routes schema + migrations dir + datasource URL based on `DATABASE_PROVIDER`
- [x] Migration scripts work for both providers locally (`pnpm db:migrate`, `pnpm db:generate`, `pnpm db:studio`)
- [x] `PingExpenses` use case flowing through Controller → Use Case → Repository → Prisma → real SQLite read
- [x] `container.ts` composition root wires the example end-to-end (incl. graceful `prisma.$disconnect` on SIGINT/SIGTERM)
- [x] Vitest test injects a fake `IPingRepository` into the use case (`PingExpenses.test.ts`)
- [x] `@prisma/adapter-pg` wired so the Postgres runtime path connects via a real `PrismaPg` adapter (verified inside the Docker stack)

**Phase 0 done when:** the trivial endpoint returns from a real DB read, the dependency-cruiser CI check passes, and the test suite runs green. **✅ Met 2026-05-11** — `/api/expenses/ping` round-trips against SQLite (local dev) and Postgres (Docker, both `decoupled` and `monolith` profiles).

---

## Phase 1 — Feature parity with Google Sheets

Goal: stop using Sheets for new entries.

### Milestone D — Categorization context

- [x] Aggregates: `Category`, `Method`, `ReimbursementStatus`
- [x] Each: `id`, `name`, `bgColor`, `textColor`, `isArchived`, `displayOrder` (+ `nameNormalized` for case-insensitive uniqueness)
- [x] Repositories with Prisma implementations
- [x] CRUD use cases (Create, Rename, ChangeColors, Archive/Unarchive, Reorder, List) — 7 per aggregate × 3 aggregates = 21
- [x] HTTP endpoints under `/api/categories`, `/api/methods`, `/api/reimbursement-statuses`
- [x] Seed script (`pnpm --filter server seed`) — idempotent upsert by normalized name, exact colors from CLAUDE.md
- [x] Frontend Settings page with full CRUD UI *(D.2 — `/settings` with three tabs: Categories table, Methods swatch grid, Statuses table; drag-to-reorder via @dnd-kit; native color picker + hex; responsive shell with side-rail/bottom-tabs; placeholder pages for other destinations)*
- [ ] Inline "+ Add new..." option at the bottom of every dropdown *(deferred to Milestone I when Quick-Add screen consumes the dropdown component)*

### Bug Fixes 1, Before doing the next Milestone
- [x] Duplicated Code in Server Controller, make a controller factory *(makeReferenceController<T> + shared helpers — parseBody, readIdParam, respondOne/Many; collapses 3 controllers to 1)*
- [x] Warnings -> Referenced UMD Global Variable in @RefenrencesTable.tsx, @SwatchGrid.tsx, and useInLineRename.ts *(fixed on refactor/settings-dedup — named type imports for ChangeEvent/KeyboardEvent/CSSProperties)*
- [x] Duplicated Code in Server Routes *(referenceRoutes(controller) reused across /api/categories, /api/methods, /api/reimbursement-statuses)*
- [x] Duplicated Test file *(extracted runReferenceEntityContract; Method/Status tests collapsed to 7-line spec invocations; coverage 109 → 140 tests)*
- [x] Deprecated Zod uuid() @categorizationSchemas.ts *(z.string().uuid() → z.uuid())*
- [x] Error @prisma.config.ts *(root cause: file was outside tsconfig.json's include glob so the editor's TS server fell back to defaults. Fixed via project references: tsconfig.json now a references root pointing at tsconfig.app.json (src/) and tsconfig.tooling.json (prisma.config.ts + vitest.config.ts, noEmit); scripts switched to `tsc -b`)*

### Milestone E — Formula evaluator

- [x] Whitelist regex blocks anything outside `0-9 + - * / ( ) . whitespace` *(ASCII-only whitespace `[ \t\n\r]`; non-ASCII whitespace like NBSP / em-space rejected)*
- [x] Parser: hand-rolled recursive descent over `expr/term/factor/primary` grammar (no `expr-eval` dependency) — all arithmetic in `bigint` at currency `minorUnits + 6` precision, half-away-from-zero rounding
- [x] **Verify no `eval` / `Function` / `vm` usage anywhere** *(`FormulaEvaluator.test.ts` reads its own source and asserts the absence of `eval(`, `new Function(`, bare `Function(`, `node:vm` import, and `vm.runIn*` calls)*
- [x] Unit tests including: simple arithmetic, parentheses, whitespace tolerance, malicious inputs (`process.exit`, `require(...)`, `__proto__`, function calls, template literals, hex/bin/scientific literals), Unicode tricks (full-width/Arabic-Indic/Devanagari digits, NBSP, ZWJ, RTL mark, fullwidth `＋`), division-by-zero, currency-precision rejection, very large bigints *(75 tests)*
- [x] Result is a `Money` instance *(via `Money.fromMinor(rounded, currency)`)*

### Milestone F — Expenses context

- [x] `Expense` aggregate: `id`, `transactionDate`, `amount: Money`, `rawInput: string | null`, `description`, `categoryId`, `methodId`, `reimbursementStatusId`, timestamps *(local `CategoryRef`/`MethodRef`/`ReimbursementStatusRef` brands keep the domain free of cross-context imports — see decision log)*
- [x] `IExpenseRepository` interface with methods that speak the domain (`findInDateRange`, `search`) — not generic CRUD *(`findUnpaidReimbursables` deferred to Milestone G; see decision log)*
- [x] Prisma implementation with mappers
- [x] Use cases: `RecordExpense`, `EditExpense`, `DeleteExpense`, `ListExpenses` (with filters), `GetExpense`
- [x] Domain events: `ExpenseRecorded`, `ExpenseEdited`, `ExpenseDeleted` *(published; no subscribers yet — Reporting/Reimbursements wire them in G/H)*
- [x] HTTP endpoints with Zod schemas *(`POST/GET /api/expenses`, `GET/PATCH/DELETE /api/expenses/:id`; replaces the Milestone-C `/api/expenses/ping` placeholder, which has been removed)*
- [x] Filter support: date range, category, method, reimbursement status, free-text search on description *(half-open date range; limit/offset pagination, default 50, max 200)*

### Milestone G — Reimbursements context

- [x] `Reimbursement` value object encoding the state machine *(`ReimbursementState` discriminated union with five variants; date carriers (`PaidReimbursable`, `EarlyReimbursement`) bundle the date on the variant)*
- [x] Use cases for each legal transition: `MarkAsPaid`, `MarkAsPending`, `MarkAsEarly`, `MarkAsUnpaid` *(plus `MarkAsNonReimbursable` for the `UnpaidReimbursable → NonReimbursable` mistake-fix path; see decisions log)*
- [x] Illegal transitions return `Result.err`, never throw *(state machine + aggregate both; aggregate untouched on `err`)*
- [x] Domain events emitted on each transition *(7 events: created, 5 mark-*, deleted)*
- [x] HTTP endpoints *(`GET /api/reimbursements/:id`, `GET /by-expense/:expenseId`, `GET ?status=unpaid&dateStart=…&dateEnd=…`, `POST /:id/mark-{paid,pending,early,unpaid,non-reimbursable}`)*
- [x] Unit tests covering every legal and illegal transition *(full 5×5 matrix on `ReimbursementState`, aggregate-level, plus per-use-case happy/illegal/not-found/invalid-id)*
- [x] Auto-create Reimbursement on `ExpenseRecorded`; auto-delete on `ExpenseDeleted` *(via `application/event-handlers/`; idempotent on replay; `kind` enum on `ReimbursementStatus` makes the mapping rename-safe)*

### Milestone H — Reporting context (Phase 1 slice)

- [ ] `MonthlySummary` projection: total expenses, by-category breakdown, by-method breakdown
- [ ] `NetOwedCalculator`: `sum(|Early|) - sum(Unpaid)` over a date range
- [ ] `AvailableBudget` (depends on monthly budget — for Phase 1, monthly budget is a config value; budgeting context comes in Phase 3)
- [ ] **Receipt export**: aggregate by description, group `Unpaid` and `Early` (negative), grand total = "amount currently owed to you"
- [ ] Output formats: rendered HTML page (printable), PDF (Puppeteer renders the same HTML), CSV
- [ ] HTTP endpoints

### Milestone I — Frontend (Phase 1 slice)

- [ ] **Quick-Add screen** (the daily driver — see CLAUDE.md for spec)
  - Mobile-first layout
  - Field order, defaults, autofocus, submit-on-Enter
  - Live formula evaluation with debounced display
  - Per-field last-used memory
- [ ] Expenses list view with all filters from Milestone F
- [ ] Expense detail/edit page with reimbursement transition controls
- [ ] Settings page (built in Milestone D)
- [ ] Receipt export page (HTML view + download buttons for PDF / CSV)
- [ ] A simple dashboard: this-month total + by-category breakdown (no charts yet)

### Milestone J — Sheets import

- [ ] `POST /api/import` endpoint accepting CSV
- [ ] Per-row Zod validation, dry-run mode, transactional insert
- [ ] Return per-row success/error report
- [ ] Frontend page to upload CSV, show results, retry failed rows
- [ ] Smoke test with the user's actual Sheets export

**Phase 1 done when:** the user has imported their historical Sheets data and is using the app daily instead of Sheets.

---

## Phase 2 — Auth and multi-user

### Milestone K — Identity context

- [ ] Choose: Lucia (or successor) vs Auth.js. Document the choice in `docs/decisions/`.
- [ ] User aggregate, session aggregate
- [ ] Email + password registration and login (or magic link, depending on choice)
- [ ] Session-based auth (not JWT) — simpler and revocable

### Milestone L — Multi-tenancy through the codebase

- [ ] `userId` added to every relevant aggregate (Expense, Category, Method, etc. — decide per context whether reference data is per-user or shared)
- [ ] Repository methods take a `currentUser` parameter (or use a request-scoped context object)
- [ ] **No service or controller may pull `userId` directly from the request** — it goes through middleware into a typed context object
- [ ] Migration script assigns all existing rows to the original user
- [ ] Tests confirming user A cannot read or modify user B's data

---

## Phase 3 — Expansion features

Roughly ordered by leverage. Order can shift based on what you actually want next.

### Tags
- [ ] Many-to-many between Expense and Tag
- [ ] CRUD, filtering, color support like categories

### Budgeting context
- [ ] `Budget` aggregate: `categoryId` (nullable for overall), `period` (monthly/weekly), `amount: Money`
- [ ] Read-side use case: given a date, return each budget with current spend and remaining
- [ ] Frontend dashboard with progress bars

### Charts and analytics
- [ ] Server-side aggregation endpoints in `reporting`
- [ ] Recharts on the client
- [ ] Specific charts: spending over time (line), this month by category (donut), month-over-month (grouped bar), budget vs actual (progress bars)
- [ ] Resist the urge to build a generic BI tool

### Recurring expenses
- [ ] `RecurringRule` aggregate
- [ ] Materialization strategy: scheduled job creates real Expense rows when due
- [ ] UI to manage rules, see upcoming/past instances

### Export expansion
- [ ] CSV export of any expenses list (in addition to receipts)
- [ ] PDF reports beyond the receipt format

### Receipt photos / OCR
- [ ] `IFileStorage` interface with local-disk implementation; S3-compatible adapter ready
- [ ] Storage picked via env config
- [ ] Vision-capable LLM API integration to extract `{ amount, date, merchant }` from photos (preferred over Tesseract for receipt accuracy)
- [ ] Pre-fill quick-add form with extracted values; user confirms before submit

---

## Phase 4 — The full ledger

This is where the app stops being an expense tracker and becomes a personal-finance system. Don't start until Phase 3 is at least partly delivered and you've actually wanted ledger features.

### Ledger context

- [ ] `Account` aggregate with `type ∈ {Asset, Liability, Equity, Income, Expense}`
- [ ] `Transaction` aggregate composed of multiple `Entry` value objects (debit/credit)
- [ ] Invariant: a Transaction's debits must equal its credits (enforced in the aggregate)
- [ ] Recording an Expense in the `expenses` context now triggers a Transaction in the `ledger` context (via domain event)
- [ ] Reimbursements become Receivable accounts
- [ ] Trial balance, balance sheet, and income statement reports
- [ ] Account ledger view (drill into any account, see all entries)

This phase will need its own detailed plan when the time comes. Don't pre-spec it now.

---

## Working agreements with Claude Code

- Always read `CLAUDE.md` and `PLAN.md` at the start of a session.
- Identify the current milestone before starting any work.
- For any non-trivial change, propose the plan first; wait for confirmation before writing.
- Ask before adding dependencies.
- Update this file (check off boxes, move "current milestone") at the end of each session.

---

## Decisions log

Use this section to record the *why* behind important choices, with date.

- **2026-05-10** — Production DB is PostgreSQL. SQLite for dev only. Mongo path stays open via the repository abstraction but is not actively planned.
- **2026-05-10** — DDD adopted. App will grow into a ledger; CRUD-shaped code would not survive that.
- **2026-05-10** — Frontend/backend support both coupled (single container, Express serves React) and decoupled (separate containers) deploy modes from a single codebase.
- **2026-05-10** — Default currency: IDR (Indonesian Rupiah). Money VO is multi-currency-capable from day one.
- **2026-05-11** — Prisma schemas live in subfolders (`server/prisma/sqlite/`, `server/prisma/postgres/`) rather than flat files. Prisma derives the migrations dir from the schema location; two schemas in one folder would share a migrations dir. Subfolders give each provider its own migrations history.
- **2026-05-11** — Prisma 7 moved schema + datasource URL out of `schema.prisma` and into `prisma.config.ts`. One config at server root routes between sqlite/postgres via `DATABASE_PROVIDER`. Side effect: `PrismaClient` no longer accepts `datasourceUrl` — it requires a driver adapter for direct DB connections. `@prisma/adapter-better-sqlite3` for dev, `@prisma/adapter-pg` for prod.
- **2026-05-11** — Docker images package the whole monorepo per stage and run `pnpm prune --prod` to drop dev deps, instead of using `pnpm deploy`. `pnpm deploy` doesn't preserve the in-place Prisma generated client across the copy, and it requires `--legacy` mode for shared lockfiles. The monorepo-copy approach keeps pnpm's symlink layout intact and ships a working runtime; image-size optimization can come later.
- **2026-05-11** — `packageManager` pinned to `pnpm@10.11.1` so corepack-installed pnpm in Docker matches local. Without the pin, Docker pulled pnpm 11 which has stricter ignored-builds semantics and a different `deploy` default.
- **2026-05-16** — Expense aggregate keeps `amount` as positive `Money`; sign-of-cash-flow is a reporting concern, never a property of the aggregate. Reaffirms CLAUDE.md "Expenses are always positive".
- **2026-05-16** — Domain events emitted from F (`ExpenseRecorded`, `ExpenseEdited`, `ExpenseDeleted`) have no subscribers yet. `InMemoryEventBus` is instantiated in `container.ts` and shared via the `Container` interface so Milestones G/H can subscribe without touching the publisher.
- **2026-05-16** — `findUnpaidReimbursables` from the original Milestone F spec deferred to Milestone G when the `Reimbursement` VO defines what "Unpaid Reimbursable" means semantically. F ships with a richer `IExpenseRepository.search(criteria)` instead — the listing UI needs filters across all dimensions anyway.
- **2026-05-16** — The Expense aggregate carries its own branded FK types (`CategoryRef`, `MethodRef`, `ReimbursementStatusRef`) rather than importing `CategoryId`/`MethodId`/`ReimbursementStatusId` from the categorization context. Reason: the dependency rule forbids cross-context domain imports. Cross-context validity checks go through three thin application-layer lookups in `categorization/application/services/` (`CategoryLookup.isActiveById` etc.) — boolean return keeps the categorization entity off the Expenses context's import surface.
- **2026-05-16** — Description search uses Prisma `contains` without `mode: 'insensitive'`. The mode flag isn't on the SQLite generated client's `StringFilter` type, and SQLite's default LIKE is ASCII case-insensitive — good enough for dev and a single-user app. Postgres LIKE is case-sensitive — revisit (lowercased denormalized column or pg_trgm) if Postgres becomes the primary daily target before Milestone I (Quick-Add UI).
- **2026-05-17** — `Reimbursement` is an aggregate (with its own `ReimbursementId`, 1:1 to `Expense` via unique `expenseId`), not a value object held on `Expense`. The CLAUDE.md phrasing "value object" refers to the state machine itself; the aggregate exists because the state + date payload + timestamps need their own identity and persistence row. The `Expense.reimbursementStatusId` (the user-facing label) is set at creation time and never updated by transitions — the `Reimbursement` aggregate is authoritative from then on. UI filtering by current state goes through `IReimbursementRepository.findUnpaidReimbursables` (and future siblings) in the reimbursements context.
- **2026-05-17** — `ReimbursementStatus` (categorization) carries an immutable `kind` enum column so the reimbursements context can translate `Expense.reimbursementStatusId` into a `ReimbursementState.kind` without depending on the label (which the user can rename). New statuses created via the HTTP factory default to `kind = 'NonReimbursable'`; the five seeded statuses are backfilled to their canonical kinds in migration `20260516130000_reimbursement_status_kind`. The `ReimbursementStatusKindLookup` application service is the only cross-context bridge needed.
- **2026-05-17** — Cross-context event subscription goes through thin re-export modules at the application layer (`expenses/application/events/index.ts`, `categorization/application/contracts/index.ts`). The dependency rule forbids `reimbursements/application/event-handlers/` from importing `expenses/domain/events/ExpenseRecorded.ts` directly; the re-export turns those classes into part of the source context's *application API* (which is what domain events conceptually are). dep-cruiser confirms no boundary violations.
- **2026-05-17** — `UnpaidReimbursable → NonReimbursable` is the only mistake-fix transition; `PaidReimbursable` and `NonReimbursable` are otherwise terminal. The 5th use case `MarkAsNonReimbursable` exists in addition to the four listed in PLAN.md G to make the mistake path explicit at the HTTP boundary. Full mesh / "fix anything" was rejected as it would gut the state machine's invariant value.
- **2026-05-17** — Reimbursement auto-creation lives in `reimbursements/application/event-handlers/CreateReimbursementOnExpenseRecorded`. For the date-bearing initial kinds (`PaidReimbursable`, `EarlyReimbursement`), the handler uses the recording's `now` as the seed date — the user corrects via the matching `mark-*` endpoint if it's wrong. Forcing a date prompt at expense-record time would have leaked reimbursement concerns into the Quick-Add Milestone-I screen.

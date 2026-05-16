# PLAN.md

The roadmap. For architectural rules, see `CLAUDE.md`.

**Current milestone:** Phase 1 / Milestone E — Formula evaluator (Milestone D complete: D.1 backend + D.2 Settings UI shipped)
**Last updated:** 2026-05-11

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
- [ ] Duplicated Code in Server Controller, add a Controller Template to reduce duplicate
- [x] Warnings -> Referenced UMD Global Variable in @RefenrencesTable.tsx, @SwatchGrid.tsx, and useInLineRename.ts *(fixed on refactor/settings-dedup — named type imports for ChangeEvent/KeyboardEvent/CSSProperties)*
- [ ] Duplicated Code in Server Routes, add Routes Template.
- [ ] Duplicated Test file 
- [ ] Deprecated Zod uuid() @categorizationSchemas.ts
- [ ] Error @prisma.config.ts (search for a possible solution before executing it)
  - TS1259: Module "node:path" can only be default-imported using the esModuleInterop flag
  - TS1343: The import.meta meta-property is only allowed when the --module option is es2020, es2022, esnext, system, node16, node18, node20, or nodenext
  - unused export define config

### Milestone E — Formula evaluator

- [ ] Whitelist regex blocks anything outside `0-9 + - * / ( ) . whitespace`
- [ ] Parser: either `expr-eval` integration or hand-rolled shunting-yard
- [ ] **Verify no `eval` / `Function` / `vm` usage anywhere**
- [ ] Unit tests including: simple arithmetic, parentheses, whitespace tolerance, malicious inputs (`process.exit`, `require(...)`, `__proto__`, function calls), Unicode tricks, division-by-zero behavior
- [ ] Result is a `Money` instance

### Milestone F — Expenses context

- [ ] `Expense` aggregate: `id`, `transactionDate`, `amount: Money`, `rawInput: string | null`, `description`, `categoryId`, `methodId`, `reimbursementStatusId`, timestamps
- [ ] `IExpenseRepository` interface with methods that speak the domain (`findInDateRange`, `findUnpaidReimbursables`, etc.) — not generic CRUD
- [ ] Prisma implementation with mappers
- [ ] Use cases: `RecordExpense`, `EditExpense`, `DeleteExpense`, `ListExpenses` (with filters), `GetExpense`
- [ ] Domain events: `ExpenseRecorded`, `ExpenseEdited`, `ExpenseDeleted`
- [ ] HTTP endpoints with Zod schemas
- [ ] Filter support: date range, category, method, reimbursement status, free-text search on description

### Milestone G — Reimbursements context

- [ ] `Reimbursement` value object encoding the state machine
- [ ] Use cases for each legal transition: `MarkAsPaid`, `MarkAsPending`, `MarkAsEarly`, `MarkAsUnpaid`
- [ ] Illegal transitions return `Result.err`, never throw
- [ ] Domain events emitted on each transition
- [ ] HTTP endpoints
- [ ] Unit tests covering every legal and illegal transition

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

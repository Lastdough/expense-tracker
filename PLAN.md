# PLAN.md

The roadmap. For architectural rules, see `CLAUDE.md`.

**Current milestone:** Phase 1 done — ready to start Phase 2 (auth, multi-user). Milestone J complete on `feature/milestone-j-sheets-import`: `POST /api/import` with dry-run + transactional commit, Sheets-format adapter (Bahasa dates, Rp+dot amounts, kebab→canonical reimbursement mapping), fuzzy "did you mean?" suggestions on unknown refs, `/import` page with file picker + per-row report + failed-rows CSV download. Smoke-tested against the user's real 103-row redacted CSV — all 103 rows valid + committed in one transaction; reimbursement aggregates auto-created via the existing `ExpenseRecorded` handler. Also integrated on this branch: v2.1 DatePicker (replaces native `<input type="date">`) and v2.3 Simple receipt redesign (letterhead + print stylesheet closing the Milestone H gap; Export split-button; `?simple=false` Complex stub). H.4 (Receipt PDF) and the v2.3 Pending modal still deferred.
**Last updated:** 2026-08-08

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
- [x] Inline "+ Add new..." option at the bottom of every dropdown *(landed with Milestone I.0's `ReferenceSelect` — sticky bottom row, minimal-field create with default neutral colours, refinement happens in Settings)*

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

- [x] `MonthlySummary` projection: total expenses, by-category breakdown, by-method breakdown *(sorted desc by total; mixed-currency in range surfaces as `MixedCurrencyInRangeError` → 409)*
- [x] `NetOwedCalculator`: `sum(Unpaid) - sum(|Early|)` over a date range *(positive = money owed to user; docs corrected vs the pre-H spec — see decisions log 2026-05-17 netOwed)*
- [x] `AvailableBudget` *(reads from H.0 budgeting context; `BudgetCurrencyMismatchError` if budget currency ≠ expenses currency)*
- [x] **Receipt export**: aggregate by description, group `Unpaid` and `Early` (negative), grand total = "amount currently owed to you"
- [x] Output formats: rendered HTML page (printable), CSV *(JSON also supported as the default `format=json`; PDF deferred — see decisions log)*
- [x] HTTP endpoints *(`GET /api/reports/monthly-summary?month=YYYY-MM`, `/net-owed?dateStart=&dateEnd=`, `/available-budget?month=YYYY-MM`, `/receipt?dateStart=&dateEnd=&format=json|html|csv`; plus H.0's `GET/PUT /api/budget/monthly`)*

### Milestone H.0 — Budgeting context shell (added during H)

- [x] `MonthlyBudget` singleton aggregate *(PK fixed to `'singleton'`; Phase 3's full budgeting context supersedes this)*
- [x] `GetMonthlyBudget` + `SetMonthlyBudget` use cases; idempotent upsert in the repo
- [x] HTTP endpoints *(`GET /api/budget/monthly`, `PUT /api/budget/monthly` with `{ amountMajor, currency }` body)*

### Milestone H.4 — Receipt PDF (deferred, run AFTER Milestone I)

Deferred from H.3. Scheduled after Milestone I so the HTML layout is locked in by the Settings/Reports UI before being baked into PDF rendering. Do not start until I lands.

- [ ] Pick PDF library (re-ask: Puppeteer for HTML→PDF fidelity vs. pdfkit for size/cold-start)
- [ ] If Puppeteer: add to dependencies (user approval required per CLAUDE.md), document Docker image impact (~150MB Chromium)
- [ ] Implement `renderReceiptPdf(receipt: Receipt): Promise<Buffer>` in `reporting/application/renderers/` (mirror existing `receiptHtml.ts` / `receiptCsv.ts` placement; revisit if a non-receipt PDF becomes needed)
- [ ] Wire `format=pdf` into `ReceiptQuery` + controller; set `Content-Type: application/pdf` and `Content-Disposition: attachment`
- [ ] Tests: golden-output PDF byte assertions are flaky, so test the *call boundary* (renderer invoked, content-type set) plus a snapshot of the intermediate HTML if reusing `renderReceiptHtml`

### Milestone I — Frontend (Phase 1 slice)

**Carryovers from earlier milestones to land in I:**
- [x] Inline "+ Add new..." at the bottom of every reference-data dropdown *(I.0 — sticky-bottom inline create on `ReferenceSelect`; Settings still uses the richer `EditDrawer` since colour customisation lives there)*
- [x] Monthly-budget setter UI in Settings *(I.4 — fourth Settings tab `Budget` consuming `PUT /api/budget/monthly`; currency dropdown locked to IDR until multi-currency lands)*

**Core I scope:**
- [x] **Quick-Add screen** (I.1) *(replaces placeholder at `/quick-add`; mobile-first, autofocus Amount, debounced 150ms formula eval via the client-ported evaluator, submit on Enter from Description, reset Amount + Description on save and refocus, per-field last-used persistence for category/method/status/date via `useLastUsed`; default landing route changed to `/quick-add`)*
- [x] Expenses list view with all filters from Milestone F *(I.2 — date range + category + method + status + description-search, URL-synced via `useSearchParams`, debounced search, cards-on-mobile / table-on-desktop, "Load more" pagination)*
- [x] Expense detail/edit page with reimbursement transition controls *(I.3 — `/expenses/:id`, diffed PATCH, delete-with-confirm; state-aware transition buttons that only render legal next moves per `legalTransitions(kind)`; date-required transitions open a small modal picker; reimbursement *label* (`reimbursementStatusId`) is editable independently of the reimbursement *state*, with UI affordances calling out the distinction)*
- [x] Settings page extended with the budget setter + revisit of the D categorization tabs *(I.4 — Budget tab added; inline-create on `ReferenceSelect` is now the standard "quick add" path for reference data, Settings continues to use the richer `EditDrawer` for colour customisation)*
- [x] Receipt export page (HTML view + CSV download button; PDF disabled until H.4) *(I.5 — `<iframe srcdoc={html}>` preview, `iframe.contentWindow.print()`, CSV via `<a href download>` against `reportingApi.receiptCsvUrl`, PDF button rendered disabled with H.4 tooltip; `mixed_currency_in_range` (409) surfaces as an inline banner)*
- [x] A simple dashboard: this-month total + by-category breakdown (no charts yet) + AvailableBudget tile *(I.6 — five tiles: This Month Total, Available Budget (green/red), By Category bars, By Method bars, Net Owed; chevron month navigator; empty states wire CTAs to Quick-Add and Settings → Budget)*

**Reskin against Claude Design v2.0 (post-I follow-up, `c58caa2` 2026-05-18):**
- [x] All six I screens reskinned to match `docs/design/Claude Design v2.0.html` *(SideRail with `NetOwedCard` wired to `reportingApi.netOwed`; BottomTabs active-pill; QuickAdd two-column desktop grid + bordered Amount card + `ChipPicker` halo selection + keyboard-hint footer; Expenses eyebrow + summary row + restyled filter pills + sticky-header table on desktop + grouped-by-day cards on mobile; ExpenseDetail header band + restyled `ReimbursementPanel` + date-picker modal + sticky footer; Receipt builder column + larger preview pane; Dashboard gradient hero + 80px mono total + by-category stacked bar; Settings `TableShell` column proportions tightened. New `ChipPicker` + `chipColors.ts` helpers.)*
- [x] Locale-aware Money formatting *(both workspaces: `currencyLocale(currency)` + identical `CURRENCY_LOCALES` map; IDR → id-ID so `Rp 1.234.567` renders consistently. `Money.format()` extracted to `shared-kernel/money/format.ts` — formatting is an application concern, the VO is now pure. Client re-derives display from `amountMinor + currency` instead of trusting the server's `amountFormatted` field.)*
- [x] Live-formatted amount input *(`useFormattedAmount` hook + `formatAmountInput`/`extractRawAmount` helpers; thousand-separator insertion as you type with `useLayoutEffect` caret restoration. Formulas (`=…`) pass through unmodified. Wired into Quick-Add and ExpenseDetail.)*
- [x] Design-todos audit *(see `docs/design/design-todos.md` for per-item close-out; eleven items closed by the reskin, the rest still pending.)*

### Milestone J — Sheets import

- [x] `POST /api/import` endpoint accepting CSV *(JSON-wrapped `{csvText, defaultYear, dryRun}`; global `express.json` limit bumped to 2 MB only for this endpoint's payload size; uses the existing `RecordExpense` validation pipeline per row)*
- [x] Per-row Zod validation, dry-run mode, transactional insert *(`ImportExpenses` use case; `IExpenseRepository.saveMany` added with Prisma `$transaction([...create])` for all-or-nothing commit; dry-run validates without persisting and without publishing events)*
- [x] Return per-row success/error report *(per-row `{ rowNumber, status, raw, error: {code, field, message, suggestion}, expenseId }`; structural failures (missing column, malformed CSV) return 422/400 with no rows)*
- [x] Frontend page to upload CSV, show results, retry failed rows *(`/import` route; native file picker + default-year input; validate / Import all buttons; per-row results table with truncation + inline error message; "Download failed rows" re-emits the original Sheets format plus an `Error` column for fix-and-retry)*
- [x] Smoke test with the user's actual Sheets export *(103-row CSV exercised against the live local SQLite; all rows parsed + reference-resolved + committed in one DB transaction; reporting/reimbursement contexts picked up the events end-to-end; cleanup done post-smoke)*

**Phase 1 done when:** the user has imported their historical Sheets data and is using the app daily instead of Sheets. **✅ Met 2026-05-18** — the Sheets-import path works end-to-end against the user's real CSV format; daily-driver use depends only on the user's own habit-switch.

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
- **2026-05-17** — `netOwed` sign convention corrected. Previous spec read `sum(|Early|) - sum(Unpaid)` "positive means money is owed to the user" — internally inconsistent: 1M Unpaid + 0 Early gave `netOwed = -1M` and therefore `availableBudget = monthlyBudget + 1M`, meaning the more people owed the user, the *more* they could spend. The receipt export already described the natural reading. Both docs and code now use `sum(Unpaid) - sum(|Early|)` — positive = money owed *to* the user — and `availableBudget = monthlyBudget - netOwed` correctly reduces spendable budget as pending reimbursements pile up.
- **2026-05-17** — Phase-1 monthly budget lives in a singleton DB row (`MonthlyBudget` aggregate, PK fixed to `'singleton'`) inside a new minimal `budgeting` context, not in an env var as the original H spec suggested. Reason: the budget needs to be editable from the Settings UI in Milestone I without a redeploy; PLAN.md's "monthly budget is a config value" note was authored before Settings existed. Phase 3's full budgeting context (per-category `Budget`) will supersede this with a migration; the singleton-shell keeps the door open.
- **2026-05-17** — Reporting owns its own Prisma read repository (`PrismaReportingReadRepository`) that queries `Expense` / `Category` / `Method` / `Reimbursement` tables directly via `aggregate` + `groupBy`, rather than calling other contexts' application use cases. The dependency rule isn't violated because the read repo is *infrastructure* and never imports another context's source files — Prisma sees the shared database, not the context boundary. Calling `ListExpenses` from reporting was rejected because it would have force-loaded full Expense aggregates into memory for what are read-side projections, and would have re-implemented filtering across two contexts.
- **2026-05-17** — Receipt PDF rendering deferred. Original H spec called for Puppeteer (HTML→PDF). Skipped for now because (a) Puppeteer ships a ~150MB Chromium and slows cold start, (b) the HTML layout isn't locked in until Milestone I's Settings/Reports UI shapes the design, and (c) HTML + CSV cover the immediate "send my friend the receipt" / "import into a spreadsheet" use cases. PDF revisited as H.4 (or its own micro-milestone) once Milestone I lands.
- **2026-05-17** — Reporting renderers (`receiptHtml`, `receiptCsv`) live in `reporting/application/renderers/`, not `interfaces/http/`. The dep rule forbids `interfaces/` from importing `domain/` directly, and renderers are pure `Receipt` → `string` transformations with no req/res coupling — that's an application concern. The controller in `interfaces/http/` sets `Content-Type` / `Content-Disposition` and pipes the rendered string. Same pattern will apply to any future PDF renderer.
- **2026-05-17** — Client formula evaluator is a code port at `client/src/lib/formulaEvaluator.ts`, not a shared workspace package. Parity with `server/src/contexts/expenses/domain/services/FormulaEvaluator.ts` is enforced by a fixture-based contract in `client/src/lib/parity-cases.ts` (`OK_CASES` + `ERR_CASES`) — if the server grammar/semantics changes, the client port AND the fixture must update together. Rejected alternative: a `shared/` pnpm workspace — too much tsconfig/build-ordering plumbing for ~150 LOC of pure arithmetic. Revisit if a third consumer (e.g. ledger / OCR pipeline) appears. Client API differs in two ways: takes `decimals: number` instead of a `Currency` enum (no currency registry on the client), and returns a discriminated union `{ ok: true | false, ... }` instead of `Result<Money, FormulaError>` so the live Quick-Add display can render "= invalid" on every partial keystroke without throwing.
- **2026-05-17** — No react-query / SWR in `client/`. Custom hooks + `http.*` (the pattern set by Milestone D's `useReferenceData`) carries every Milestone I screen. Adding a query lib was deferred until real pain surfaces — the only place pagination could push toward one is the Expenses list, and "Load more" with manual cache concat is fine for a single-user app.
- **2026-05-17** — Per-field "last used" memory splits stable vs transient fields. Quick-Add persists category, method, status, and date via `useLastUsed` (localStorage `expense-tracker:lastUsed:*` namespace) — they carry across submissions AND across browser sessions. Amount and description are not persisted — they reset on each successful submit, matching CLAUDE.md's "reset and refocus Amount" rule. If the stored category/method/status id has been archived since last visit, the seed effect on `/quick-add` mount falls back to the first active item (Non-Reimbursable preferred for status).
- **2026-05-17** — `/expenses/:id` is its own React Router route, not a drawer overlay on `/expenses`. Reasons: shareable URLs, browser back works without modal-routing wiring, the reimbursement transition panel is non-trivial UI that benefits from full-page real estate on mobile. Delete navigates back to `/expenses` with a toast.
- **2026-05-17** — On the Expense detail page (I.3), the user-visible reimbursement *label* (`Expense.reimbursementStatusId`) and the reimbursement *state* (`Reimbursement.kind`) are two separate controls. The label is a `ReferenceSelect` that edits via PATCH; the state is a panel of buttons that hit the `/api/reimbursements/:id/mark-*` endpoints. This matches the existing decision (`Expense.reimbursementStatusId` is set at creation time and never updated by transitions) but introduces a UX concern: a copy explainer ("The label is what shows in lists. The actual reimbursement state is controlled below.") sits between the two controls, and the current state renders as a chip + dates next to the transition buttons. Worth revisiting if user testing surfaces confusion.
- **2026-05-17** — Receipt preview uses `<iframe srcdoc={html}>`. The server's `receiptHtml.ts` is the single source of truth for layout (and will be the input to H.4 PDF rendering). Print = `iframe.contentWindow.print()`; the surrounding app chrome is excluded automatically because the print scope is the iframe. CSV downloads via a plain `<a href download>` pointed at `reportingApi.receiptCsvUrl(...)` (an absolute URL through `absoluteUrl()` so decoupled mode works). PDF button is rendered disabled with a tooltip until H.4 lands.
- **2026-05-17** — `Chip` and `Toast` moved from `client/src/routes/settings/components/` to `client/src/components/` (app-wide UI). Re-exports left at the original paths so existing Settings imports keep working; new screens import the shared path directly. Settings-specific components (`ReferenceTable`, `SwatchGrid`, `EditDrawer`, `ColorDot`, `ShowArchivedToggle`) stay in `routes/settings/components/` since they're shaped to the reference-data grid/table pattern, not generally reusable.
- **2026-05-17** — Vitest added to `client/` as a dev dependency (just `vitest`, no `jsdom`/`@testing-library/react`). Scope kept minimal because I.0's test surface is two pure-module suites (`formulaEvaluator` parity + `money` formatting). Component tests deferred — manual browser smoke per sub-milestone is the verification gate. If component tests become necessary later, add `jsdom` + RTL in their own dependency-add turn.
- **2026-05-17** — Default landing route changed from `/settings` to `/quick-add`. Settings was the default only because it was the first implemented screen; Quick-Add being the daily driver per CLAUDE.md makes it the right home.
- **2026-05-18** — Milestone I reskinned against `Claude Design v2.0.html` in a single commit (`c58caa2`) after the initial Phase-1 frontend (`96a9135`) shipped with `[TEMPORARY visuals, pending design v2.0 alignment]`. The two-step (functional first, visual second) was a deliberate sequencing decision so use-case logic and API wiring could solidify before the design surface got rebaked. Bundled into the reskin commit: the locale-aware Money pipeline that surfaced during visual QA (US-style commas leaking into `Rp` values), `Money.format()` extracted out of the domain VO into `shared-kernel/money/format.ts` to keep the VO pure, and the `useFormattedAmount` live-thousand-separator input. Eleven `docs/design/design-todos.md` items closed in the same pass; the remaining items (real date-picker, print page-break stylesheet, skeleton loaders, archived-reference warning, motion, microcopy, dark mode, a11y) stay open and are not blockers for J.
- **2026-05-18** — Sheets import lives entirely inside `expenses/`, not in a separate `import` bounded context. The use case (`ImportExpenses`) bulk-creates Expense aggregates and is the only consumer of the Sheets CSV format; no other context cares. Cross-context reads (resolving category/method/status by name) go through the existing `*Lookup` services in `categorization/application/services/` — same boundary the `RecordExpense` use case already crosses. A standalone `import` context was rejected: a single bounded entrypoint and zero domain concepts of its own → no aggregate, no value objects, no events. Adding a context for one use case would be cargo-culting.
- **2026-05-18** — `papaparse` added as a server dependency (with `@types/papaparse`). User pre-approved per the dependency-add discussion. Hand-rolled CSV parsing was considered but rejected — RFC 4180 has more edge cases than the Sheets-export quirks (quoted fields containing commas, escaped quotes, CRLF mixed with LF) and the use case is for *importing the user's actual messy historical data*, so robustness matters more than the ~20 KB bundle cost. Stays server-side only — the client reads files as text and POSTs the string.
- **2026-05-18** — CSV travels as a JSON-encoded string field (`{ csvText: string, defaultYear, dryRun }`), not as a multipart/form-data upload. No `multer` dependency; the global `express.json` limit is bumped to 2 MB + 1 KB envelope (cap matched by `MAX_CSV_BYTES` in the Zod schema). 2 MB ≈ 25k typical rows — comfortably above any single-user history. For a multi-user future where uploads are larger or come from untrusted sources, revisit multer + streaming.
- **2026-05-18** — Sheets format has its own dedicated adapter (`expenses/application/services/SheetsRowParser.ts`) rather than a generic CSV-import abstraction. The parser bakes in: Bahasa month names (`Mei`→May, `Agu`→Aug, `Okt`→Oct, `Des`→Dec, plus full forms), `Rp` + Indonesian dot-thousand-separator amounts with negative-as-Early-Reimbursement semantics, and a kebab→canonical map for the user's historical reimbursement vocabulary (`early-reimburse`→Early Reimbursement, `onhold-reimbursable`→Pending Reimbursement, etc.). A generic adapter would have meant either (a) writing a column-mapping UI now (Milestone-J scope creep) or (b) leaking these quirks across multiple layers. One adapter, one CSV format — replaceable when a second import source appears.
- **2026-05-18** — All-or-nothing commit via `IExpenseRepository.saveMany(...)` wrapped in a Prisma `$transaction([...create])`. Per-row best-effort was rejected because the dry-run flow makes "fix every flagged row, then commit" cheap — the user already sees all errors in one pass and downloads them as CSV. Partial commits make audit trails harder (which 73 of 103 rows actually landed?) and require careful idempotency design for retries. The `saveMany` interface uses `create`, not upsert, on the explicit assumption that import is greenfield — re-importing the same file double-creates rows. If reimport-deduplication becomes a requirement, add a content-hash unique index or a dedicated `findByImportFingerprint` repository method.
- **2026-05-18** — Reimbursement aggregates are auto-created at import time by the existing `CreateReimbursementOnExpenseRecorded` event handler — `ImportExpenses` publishes one `ExpenseRecorded` per persisted row, identical to what `RecordExpense` does. No bulk-create shortcut for Reimbursements. The seed date on `PaidReimbursable` / `EarlyReimbursement` is the handler's `now` (the import time), not the Expense's `transactionDate`. Matches the existing decision (2026-05-17) for non-bulk record. If date fidelity for imported historical reimbursements becomes important, the handler grows a "use transactionDate when seeded from a bulk import" branch.
- **2026-05-18** — Fuzzy "did you mean?" suggestions on unknown reference data go through a Levenshtein-distance helper (`expenses/application/services/findClosestName.ts`). Two bounds: absolute (≤3 edits) AND relative (≤ floor(query.length/2)) — without the relative bound, "xyz" matches "BCA" with distance 3 and produces a non-useful suggestion. The suggestion is informational only — the row still fails and the user must fix the source CSV. Auto-rename in the UI was deferred; could be a follow-up if the user sees the same typo repeatedly. Candidate snapshot is loaded once per import, not per-row, to avoid N queries.
- **2026-05-18** — `/import` lives as a top-level nav item, not as a Settings tab. The BottomTabs grid widens to `grid-cols-6`. Reasoning: the import flow is a process (pick → validate → review → commit) that benefits from full-page real estate and would be cramped inside the Settings tab strip, even though the cadence is "occasional" rather than "daily". Quick-Add stays the default landing page. If a future "Data" hub emerges (export, import, backup, restore), Import can move under it.
- **2026-08-08** — **A transaction date is a calendar day whose canonical instant is midnight UTC, on both sides of the wire.** The client and server disagreed about which day an expense belonged to. The **write** path was the real damage: `QuickAdd`, `ExpenseDetail`, `Expenses` and `Receipt` each built local midnight (`new Date(y, m-1, d, 0,0,0,0).toISOString()`) and persisted it, so at WIB (UTC+7) an expense entered on the 1st was stored as the previous day at 17:00Z — and the server, which buckets months in UTC (`gte: start, lt: end`), counted it in the month before. The **read** path compounded it: `Dashboard.monthBounds` and `SideRail.monthRangeIso` built local bounds, so the range asked for was also shifted. New `client/src/lib/date.ts` owns the primitives and CLAUDE.md carries the rule; the six affected files now go through it. Two deliberate calls: `todayYmd()` still reads the **local** clock, because "what day is it for the person using the app" is a human fact — only instants *derived* from a label are UTC; and range upper bounds moved from `23:59:59.999` to the first instant of the next UTC day, since every server filter is half-open and the old bound both drifted and clipped the last day. `DatePicker`'s `toIso`/`fromIso` are a self-consistent local-`Date` ↔ `YYYY-MM-DD` pair that never mints an instant, so they are unchanged. Tests run every assertion under `UTC`, `Asia/Jakarta` and `America/New_York` — a date helper correct in only one sign of offset is the original bug. **Existing rows are not migrated**; the fix stops new drift only.

# Expense Tracker

A personal-finance application built to replace a long-running Google Sheets + Form workflow with something that actually scales as a ledger. Single user, no auth, deployable as either a coupled monolith or a decoupled API + SPA.

This repository is the **Phase 1 portfolio snapshot** — feature parity with the original spreadsheet, end-to-end, with the architectural runway in place for the ledger and multi-user features that come next.

> Tagged `v1.0-phase1` — Phase 1 (feature parity with Google Sheets) is complete. A live demo with mock data is planned on Vercel; URL will land here once deployed.

---

## Screenshots

_Placeholders — to be added._

| | |
| --- | --- |
| `Quick-Add` (mobile-first daily driver, formula-aware amount) | `Expenses` (URL-synced filters, table/cards switchover) |
| `Expense detail` (reimbursement state machine controls) | `Receipt` (printable HTML + CSV download) |
| `Dashboard` (Net Owed, Available Budget, by-category) | `Settings` (categories, methods, statuses, budget) |

---

## What it does

- **Quick-Add screen** for daily expense entry. Mobile-first, autofocuses Amount, evaluates inline formulas (`=20000*5`, `=99000-81000`) with a sandboxed parser, submits on Enter, persists "last used" Category / Method / Status / Date across visits.
- **Reimbursement state machine** — every Expense is `NonReimbursable`, `UnpaidReimbursable`, `PaidReimbursable`, `EarlyReimbursement`, or `PendingReimbursement`. Legal transitions are encoded; illegal transitions return an error result, never silently succeed.
- **Expenses list** with URL-synced filters (date range, category, method, status, description search) and pagination. Mobile cards / desktop table without duplicating code.
- **Reference data managed in-app** — Categories, Methods, Reimbursement Statuses each support create / rename / colour-change / archive / reorder. Archive instead of delete so historical Expenses aren't orphaned.
- **Settings → Budget tab** — a singleton monthly budget that powers an `Available Budget = monthlyBudget − netOwed` tile on the Dashboard.
- **Net Owed calculation** — `sum(Unpaid in range) − sum(Early in range)` rendered both as a Dashboard tile and as a printable Receipt.
- **Receipt export** — HTML view (printable from the browser) + CSV download for any date range, with currency-mixed-range error handling.
- **Dashboard** — Available Budget, Net Owed, This Month Total, By-category and By-method breakdowns. Month navigator with chevrons.
- **Sheets CSV import** — `POST /api/import` with dry-run mode and transactional commit (all rows land or none). Bahasa month names, `Rp` + dot-thousand-separator amounts, kebab-case reimbursement statuses (the user's actual historical vocabulary). Fuzzy "did you mean?" suggestions on unknown categories / methods / statuses.

---

## Why it exists (the technical hook)

The interesting part of this project is the **architecture**, not the feature list. The app is a learning vehicle for Domain-Driven Design in TypeScript — specifically, the kind of DDD that survives a swap of database, framework, or transport layer without rewriting the business logic.

### Bounded contexts

Code is organised by **bounded context** rather than by technical concern:

```
server/src/contexts/
├── expenses/         # Recording, editing, listing expense entries
├── categorization/   # Reference data (Category, Method, ReimbursementStatus)
├── reimbursements/   # Reimbursement state machine + transitions
├── budgeting/        # Monthly budget singleton
└── reporting/        # Read-only projections (receipts, summaries, net-owed)
```

Each context has the same internal shape:

```
<context>/
├── domain/           # Aggregates, value objects, repository interfaces, events
├── application/      # Use cases, DTOs, application services, event handlers
├── infrastructure/   # Prisma-backed repositories, mappers
└── interfaces/       # HTTP controllers, routes, Zod schemas
```

### The dependency rule (enforced by CI)

Inside any context, dependencies point inward only:

```
interfaces ──┐
             ├──► application ──► domain
infrastructure ──┘
```

- `domain/` may import from nothing except `shared-kernel/`.
- `application/` may import from its own `domain/` and `shared-kernel/`.
- `infrastructure/` and `interfaces/` may import from `application/` and `shared-kernel/`.
- **Nothing in `domain/` or `application/` may import from `@prisma/client`, `express`, or `zod`.**

This is enforced by [`dependency-cruiser`](https://github.com/sverweij/dependency-cruiser) — CI fails the build if a layer reaches outward. Cross-context communication goes through application-layer services or domain events on an in-memory event bus, never through direct domain or infrastructure imports.

### Why this strictness?

The dev DB is SQLite (via `@prisma/adapter-better-sqlite3`), production is Postgres (via `@prisma/adapter-pg`). The only way that swap is cheap is if the Service layer never knows which is underneath. The `Repository` interface lives in `domain/repositories/`; the Prisma implementation lives in `infrastructure/persistence/prisma/`. The composition root in `container.ts` is the only place that knows how to wire them together. Swapping persistence is one file.

### Money is never a `number`

All monetary values are a `Money` value object with `{ amount: bigint, currency }` where `amount` is integer minor units. Float arithmetic is banned by convention; cross-currency operations throw. Formatting is a separate concern from the VO (`shared-kernel/money/format.ts`).

### Formula safety

Quick-Add accepts formulas like `=20000*5`. The evaluator is a hand-rolled recursive-descent parser with an explicit whitelist regex on the input character set — **no `eval()`, no `new Function()`, no `vm.runInNewContext()`**. The evaluator's own tests assert the absence of those constructs anywhere in its source. Unicode tricks (NBSP, full-width digits, RTL marks) are rejected up front.

### Cross-context coordination via events

When an Expense is recorded, the `expenses` context publishes an `ExpenseRecorded` event. The `reimbursements` context subscribes and materialises a `Reimbursement` aggregate with the matching kind. The `reporting` context's read repo reads the same data via Prisma. **No context imports another context's domain code.** The dependency rule holds.

### Deployment-mode-agnostic from day one

The same codebase ships as either:

- A **coupled monolith** — one Express process serves the built React SPA as static files (`SERVE_FRONTEND=true`).
- A **decoupled** API + SPA — Express runs as API-only; the React build is served by nginx or a CDN. CORS configured, `VITE_API_URL` lets the SPA point at an absolute API URL.

Three Dockerfiles cover the variants (`Dockerfile.api`, `Dockerfile.web`, `Dockerfile.monolith`). The decision was made on day one to avoid an expensive split later.

---

## Tech stack

**Backend**
- Node.js + Express 5, TypeScript via `tsx` in dev
- Prisma 7 ORM with provider switch via `prisma.config.ts` (SQLite for dev, Postgres for prod)
- Zod 4 for HTTP-boundary validation
- Vitest for unit + integration tests
- `dependency-cruiser` for architectural rule enforcement
- `papaparse` for CSV import

**Frontend**
- React 19 (new compiler), TypeScript, Vite 6
- Tailwind CSS v4
- `react-router-dom` v7 (file-organised)
- `motion/react` for animations
- `lucide-react` + Google Material Symbols for icons
- `@dnd-kit/*` for drag-reorder in Settings
- `react-color` for the colour-edit drawer
- Vitest for the client-side formula evaluator + Money parity tests

**Tooling**
- pnpm workspaces (`server`, `client`)
- TypeScript project references with composite builds
- Docker + docker-compose for the Postgres profile

---

## Running locally

### Prerequisites

- Node.js 20+
- pnpm 10.11.1 (pinned via `packageManager` field; `corepack enable` will pick it up automatically)

### Setup

```sh
# Install dependencies for both workspaces
pnpm install

# Configure environment (defaults are fine for local dev)
cp server/.env.example server/.env

# Generate the Prisma client + run SQLite migrations
pnpm --filter server db:generate
pnpm --filter server db:migrate

# Seed reference data (categories, methods, reimbursement statuses with their canonical colours)
pnpm --filter server seed
```

### Dev server (coupled mode)

```sh
pnpm dev
```

This runs Express on `http://localhost:3000`. Vite is mounted as middleware, so the React app HMRs in place — no second port to manage.

### Tests

```sh
pnpm test          # everything
pnpm --filter server test     # backend only
pnpm --filter client test     # frontend (formula parity + Money formatting)
```

### Architecture lint

```sh
pnpm lint:deps     # dependency-cruiser; fails on cross-layer or cross-context violations
```

### Build

```sh
pnpm build         # builds both workspaces; client output lands in client/dist
```

### Postgres (Docker)

The decoupled and monolith Docker profiles run the same code against Postgres:

```sh
docker compose --profile decoupled up --build
# or
docker compose --profile monolith up --build
```

---

## Project layout

```
/
├── server/                       # API + SSR shell
│   ├── src/
│   │   ├── shared-kernel/        # Money, Result, branded IDs, event bus, base errors
│   │   ├── contexts/             # Bounded contexts (one folder per)
│   │   ├── container.ts          # Composition root — only place classes are instantiated
│   │   ├── seed.ts               # Reference-data seed script
│   │   └── server.ts             # Express + Vite middleware setup
│   ├── prisma/
│   │   ├── sqlite/               # Schema + migrations for dev SQLite
│   │   └── postgres/             # Schema + migrations for prod Postgres
│   └── prisma.config.ts          # Routes provider via DATABASE_PROVIDER env
├── client/                       # React SPA
│   ├── src/
│   │   ├── api/                  # Typed HTTP client (reads VITE_API_URL)
│   │   ├── components/           # Cross-route components (DatePicker, BottomSheet, Popover, …)
│   │   ├── shell/                # SideRail, BottomTabs, layout
│   │   └── routes/               # File-organised routes
│   └── package.json
├── docs/
│   ├── domain/                   # Per-context narrative docs
│   └── design/                   # Visual reference + design todos
├── CLAUDE.md                     # Architectural rules + conventions (read first)
├── PLAN.md                       # Roadmap with milestones + decisions log
├── Dockerfile.api / .web / .monolith
├── docker-compose.yml
└── package.json                  # Workspace root
```

---

## Roadmap

Phase 1 (feature parity with Google Sheets) is complete in this snapshot. Subsequent phases — auth + multi-user, a full double-entry ledger (Accounts / Transactions / Entries), tags + recurring expenses + receipt OCR — are sketched in [`PLAN.md`](./PLAN.md). The decisions log there captures the *why* behind every non-obvious architectural choice and is worth scanning if you want to see how the design evolved.

---

## License

Released under the [MIT License](./LICENSE).

Copyright (c) 2026 Abdurrahman.

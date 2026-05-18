# Design TODOs — picked up during build

The current design covers Milestone H + I. These are the gaps I noticed when cross-referencing PLAN.md, not blocking — handle them as the corresponding code lands.

**Last reviewed:** 2026-05-18 (against `Claude Design v2.0.html`, after Milestone J shipped on `feature/milestone-j-sheets-import`; v2.1 date picker landed on `feature/v2.1-date-picker`)

---

## Questions for design

> **For Claude Code:** when you hit a design ambiguity mid-build, append a question here and **stop** — don't guess. The human will bring the question back to the design agent, who produces a new `Claude Design v<N>.html` revision and answers inline below. Remove answered questions once their design has landed in the current canonical HTML.
>
> Format:
> ```
> ### <screen> · <short title>          <date> · <milestone>
> **Context:** what you're building, link to the file/component
> **Ambiguity:** what the current canonical design doesn't say
> **Options you considered:** (optional)
>
> **Answer:** _(filled in by design)_
> ```

_No open questions._

---

## Milestone G — Reimbursements UI

Currently the slide-over / bottom sheet shows status as a read-only chip with a history timeline. The **Edit** button is a stub.

- [x] **Transition controls in the detail drawer** — surface the legal next-states from the current status as buttons in the drawer footer (or as a popover off the status chip). E.g. from `Unpaid Reimbursable` show: `Mark as Paid` · `Mark as Early` · `Mark as Pending`. Illegal transitions hidden, not greyed. *(I.3 — `ReimbursementPanel` renders only `legalTransitions(kind)` as buttons; drawer became a dedicated `/expenses/:id` route per the 2026-05-17 decision)*
- [x] **Confirmation for terminal states** — `Mark as Paid` is essentially closing the loop; ask "Paid on what date?" before committing (state needs `paidAt`). *(I.3 — date-required transitions open an inline modal date-picker; the reskin restyled this modal but didn't change behavior)*
- [ ] **"Receipt sent" affordance for Pending** — when moving Unpaid → Pending, prompt for a note ("submitted to finance, awaiting approval").
- [ ] **Bulk transitions on the list** — multi-select rows in the expenses list, then "Mark N as Paid". Not in the design; needs one when G lands.
- [ ] **State-machine legend** in Settings → Statuses (a small diagram showing the legal arrows). Helps future-you remember why illegal transitions error.

## Milestone H — Reporting gaps

- [x] **CSV export** — the design's receipt page only has "Export PDF". Add a sibling button + a format picker (PDF / CSV / Print). The same builder filters should drive both. *(H.3 server + I.5 client; reskin moved CSV/Print/PDF into the header action group and the mobile-only secondary row. PDF still rendered disabled until H.4)*
- [x] **AvailableBudget** — PLAN defers monthly budget to Phase 3, but for Phase 1 it's a config value. Decide: hide entirely until Phase 3, or surface a small "X% of monthly budget used" line under the dashboard hero? *(Resolved via H.0 singleton + I.6 Dashboard tile; AvailableBudget renders green/red, Settings → Budget tab edits the singleton. Phase 3's per-category budget will supersede.)*
- [x] **Net-owed math display** — side rail shows `Early − Unpaid`. Receipt total is `Unpaid + Early + Pending`. These are different numbers and currently look the same shape. Audit the copy so they don't confuse. *(Reskin: SideRail NetOwedCard labels the value "Net owed to you" and shows the formula explicitly as `Unpaid X − Early Y`; receipt grand-total row labels itself "Amount currently owed to you". Sign convention also corrected in the 2026-05-17 decision log.)*
- [ ] **Print stylesheet** — receipt preview uses screen colors. Real print needs: page-break rules between sections, header repeating on each page, no shadows/borders that don't print, "Page N of M" footer. *(Receipt HTML has a minimal `@media print` block — padding + table header background — but no page-break/repeat/footer. Revisit in H.4 alongside PDF.)*

## Milestone I — Frontend gaps

- [x] **Empty states** — *(Expenses, Receipt, Dashboard all have empty-state copy + CTAs after the reskin)*
  - Expenses list: no expenses yet (first-run), no results from current filter (vs "no expenses this month") *(reskin: `EmptyState` in `Expenses.tsx` — "No expenses match these filters" + Reset / Add an expense links)*
  - Receipt: filters match zero expenses (currently just "No expenses match these filters." — fine but could earn a small illustration) *(reskin: pre-generate placeholder "The preview appears here once you tap Generate receipt"; post-generate empty handled by the server HTML's "No Unpaid or Early reimbursements in this range." block. Illustration still nice-to-have.)*
  - Dashboard: no expenses this month *(I.6 — tile empty states wire CTAs to Quick-Add and Settings → Budget)*
- [ ] **Loading states** — skeleton for the list, a spinner state on the keypad's live eval, optimistic UI on Save *(Reskin uses `Loader2` spinners on Expenses, Receipt, Dashboard, ExpenseDetail; skeleton placeholders + optimistic-save UI still missing.)*
- [ ] **Error states** — formula eval error inline (the design's mobile shows `· invalid characters`; desktop popover does not), save-failed toast, network-offline banner *(Toast + Receipt inline banner exist; formula error surfaces as "= invalid" in the resolve line. Network-offline banner not implemented.)*
- [ ] **Archived reference data on old expenses** — if a category is archived but historical expenses still reference it, the chip must still render correctly. The design doesn't show this case. Settings should preview "this category is archived — N historical expenses still use it" before allowing.
- [x] **Inline "+ Add new…" in dropdowns** — PLAN.md D.2 deferred this to Milestone I. Needs a design: probably the existing select stub gains a footer row with `+ New category` that opens a tiny inline form. *(I.0 — `ReferenceSelect` sticky-bottom inline create; minimal-field create with neutral default colours, full customisation lives in Settings.)*
- [x] **Long values** — descriptions over ~60 chars, amounts over Rp 99.999.999, very long category names. The table layout truncates with ellipsis but the slide-over might wrap awkwardly. *(Reskin: `truncate pr-3` on description cells, `tabular-nums whitespace-nowrap` on amounts, `Chip` truncates names. Slide-over replaced by full-page `/expenses/:id`.)*
- [x] **Date picker** — the design shows a "Today · 11 May" button. Real picker needed: today / yesterday quick-jumps, calendar grid, keyboard nav. *(v2.1 — `client/src/components/DatePicker.tsx` + `Popover` + `BottomSheet` hosts; single-mode with Today/Yesterday/7-days-ago jumps in Quick-Add and ExpenseDetail (form + Mark-as-Paid/Early modal); range-mode in Expenses filter (two triggers sharing one picker, `anchorOn` so tapping "To" first lets the user grab a back-to range) and Receipt builder (sidebar presets on desktop, top-bar presets in mobile bottom-sheet). Full keyboard map per `docs/design/v2.1/date-picker.jsx` — ←/→/↑/↓, Home/End, PgUp/PgDn ±Shift, T, Enter, Esc.)*
- [x] **Mobile expenses search** — header has the search icon but no search UI exists yet. *(I.2 + reskin: mobile Filter button opens `FilterBar` which contains the Search field; debounced + URL-synced.)*
- [x] **Per-field "last used" memory** — the design hardcodes RECENT_CATS / RECENT_METHODS arrays. The real thing reads from localStorage on mount. Make sure the chip ordering animates when it changes rather than just jumping. *(I.1 — `useLastUsed` reads/writes localStorage under `expense-tracker:lastUsed:*`; archived id falls back to first-active. Animated reordering of chips on change is still future polish — file under cross-cutting motion.)*

## Milestone J — Sheets import (shipped, no canonical design)

The Sheets-import page was built without a design-v2.0 region — there isn't one. Surfacing the gaps here so a future design pass can pick them up.

- [ ] **Drag-and-drop file zone** — currently a `<label>` wrapping a hidden `<input type="file">`; clicks open the picker. A real drag-drop affordance with `dragenter`/`dragleave`/`drop` would match the "upload your sheet" UX better.
- [ ] **Column-mapping UI** — today the parser is hard-coded to the user's Sheets format. A second import source (a bank CSV, a different template) needs a header-mapping step. Out of scope until that second source actually appears.
- [ ] **Inline rename for fuzzy suggestions** — when a row fails with `Unknown category "Foods" — did you mean "Food"?`, the user re-edits their source CSV. A "Apply 'Food' to all rows" affordance would close the loop without leaving the page. Probably depends on whether the user actually sees the same typo repeatedly during real use.
- [ ] **Progress indicator for big imports** — 103 rows commit instantly; 10k might not. Add a per-row tick / progress bar once we have a real-life dataset that takes more than ~1s.
- [ ] **Imported batch as a unit** — show "imported on 18 May 2026" as a group on the Expenses list (or in Settings → Imports history) so the user can undo an entire batch. Not currently tracked; would need a `batchId` on Expense or a separate `Import` aggregate.
- [ ] **Reimbursement date inheritance** — `PaidReimbursable` / `EarlyReimbursement` rows imported from Sheets get `now` (import time) as the reimbursement date, not the row's `transactionDate`. If date fidelity matters for back-imported reimbursements, surface a "use transaction date as reimbursement date" toggle on the import page.

## Cross-cutting polish (not blocking H or I)

- [ ] **Focus styles** — designed focus rings on every interactive element, not just `outline-none`. Tab through the entire Quick-Add flow keyboard-only. *(Reskin added `:focus` rings on `.filter-input` and `.builder-input`; ChipPicker / ReferenceSelect / nav links not audited end-to-end.)*
- [ ] **Motion** — `motion/react` is in the stack but unused in the design. Slide-over and bottom sheet are the obvious wins; chip "last used" reorder is the subtle one. *(Reskin commit explicitly notes `motion/react` remains unused.)*
- [x] **Icons audit** — the design uses inline lucide-shaped SVGs. Swap to real `lucide-react` once we're in the actual codebase; ensure consistent stroke width. *(Reskin uses `lucide-react` icons throughout Expenses, Receipt, Dashboard, ExpenseDetail, BottomTabs, SideRail; stroke width consistent at the lucide default.)*
- [ ] **Dark mode** — not in the design, not in PLAN. Defer or decide.
- [ ] **Accessibility audit** — chip contrast, especially Mandiri (light blue on dark navy) and the dim/inactive state in the receipt builder.
- [ ] **Microcopy pass** — the design uses placeholders like "What was it for?" and "Per-field last-used memory orders these chips." Final copy needs a voice (warm / dry / Bahasa-friendly?).

---

## Milestone v2.3 — deferred (next pass)

`docs/design/v2.3/` ships a single design pass covering receipt printing, the Pending transition note, and a Simple receipt variant. Scoped out of the v2.1 pass; needs its own plan once v2.1 lands and `feature/milestone-j-sheets-import` is merged. **Pre-bound decisions** (so the design choices don't get lost):

- [ ] **Pending requires a `note` (only)** — minimal domain change. Add `note: string` to the `PendingReimbursement` state variant; introduce `PendingNoteRequired` error; `MarkAsPending` use case signature changes; one Prisma migration. **Decided 2026-05-18:** skip `submittedAt` and `expectedBackBy` from the v2.3 design — submittedAt stays implicit (= timestamp), the expected-back affordance is dropped. Lower migration risk; the audit-trail note is the load-bearing piece.
- [ ] **Simple receipt replaces complex** — no toggle. The Receipt page renders only the three-column (Description / Unpaid / Early) layout with a Net Owed total. **Decided 2026-05-18:** rejected the dual-mode toggle from `docs/design/v2.3/app.jsx` § 2 in favour of a single canonical layout. Server-side `receiptHtml.ts`, `receiptCsv.ts`, and (eventually) the PDF renderer all converge on the simple shape. Pending items fold into Unpaid with a small inline pending tag, per `simple-receipt.jsx`.
- [ ] **Print stylesheet** — `@page` + `@media print` block per `docs/design/v2.3/app.jsx` § 3: A4 portrait, no shadows, status-block `break-inside: avoid`, repeating thead, fixed-position footer with `counter(page)/counter(pages)` "Page N of M". Lands inside the same server template the simple receipt rewrites.
- [ ] **Export menu split-button** — promote the current header-action group to a proper PDF / CSV / Print dropdown (`docs/design/v2.3/app.jsx` § 1). Filter state stays single-sourced; `format=` query param is the only thing that changes per item.
- [ ] **Net-owed math copy pass** — `docs/design/v2.3/app.jsx` § 4 reiterates the SideRail-vs-receipt naming. Most of this shipped with the v2.0 reskin (`NetOwedCard` labels the formula explicitly); a final copy audit when the simple receipt lands.
- [ ] **Pending history affordance** — `PendingHistory` timeline component on ExpenseDetail (`docs/design/v2.3/pending-modal.jsx` lines 276+). Renders the immutable note as a journal entry; carries over to the list view as the chip's secondary line ("Pending · awaiting Adi").

## Out of scope until Phase 2+

Listed only so they're not forgotten:

- Auth / login / signup screens (Phase 2 / Milestone K)
- Multi-user data scoping in the UI (Phase 2 / L)
- Tags UI (Phase 3)
- Budget visualization beyond a single number (Phase 3)
- Real charts: spending over time line, donut by category, MoM grouped bar, budget progress bars (Phase 3)
- Recurring expenses (Phase 3)
- Receipt photo upload + OCR pre-fill (Phase 3)
- Account ledger drill-down, trial balance, balance sheet, income statement (Phase 4)

When any of these become real, come back here and we'll design them on top of the current canonical design's foundation.

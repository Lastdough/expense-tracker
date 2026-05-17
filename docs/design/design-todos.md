# Design TODOs — picked up during build

The current design covers Milestone H + I. These are the gaps I noticed when cross-referencing PLAN.md, not blocking — handle them as the corresponding code lands.

**Last reviewed:** 2026-05-17 (against `Claude Design v2.0.html`)

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

- [ ] **Transition controls in the detail drawer** — surface the legal next-states from the current status as buttons in the drawer footer (or as a popover off the status chip). E.g. from `Unpaid Reimbursable` show: `Mark as Paid` · `Mark as Early` · `Mark as Pending`. Illegal transitions hidden, not greyed.
- [ ] **Confirmation for terminal states** — `Mark as Paid` is essentially closing the loop; ask "Paid on what date?" before committing (state needs `paidAt`).
- [ ] **"Receipt sent" affordance for Pending** — when moving Unpaid → Pending, prompt for a note ("submitted to finance, awaiting approval").
- [ ] **Bulk transitions on the list** — multi-select rows in the expenses list, then "Mark N as Paid". Not in the design; needs one when G lands.
- [ ] **State-machine legend** in Settings → Statuses (a small diagram showing the legal arrows). Helps future-you remember why illegal transitions error.

## Milestone H — Reporting gaps

- [ ] **CSV export** — the design's receipt page only has "Export PDF". Add a sibling button + a format picker (PDF / CSV / Print). The same builder filters should drive both.
- [ ] **AvailableBudget** — PLAN defers monthly budget to Phase 3, but for Phase 1 it's a config value. Decide: hide entirely until Phase 3, or surface a small "X% of monthly budget used" line under the dashboard hero?
- [ ] **Net-owed math display** — side rail shows `Early − Unpaid`. Receipt total is `Unpaid + Early + Pending`. These are different numbers and currently look the same shape. Audit the copy so they don't confuse.
- [ ] **Print stylesheet** — receipt preview uses screen colors. Real print needs: page-break rules between sections, header repeating on each page, no shadows/borders that don't print, "Page N of M" footer.

## Milestone I — Frontend gaps

- [ ] **Empty states** —
  - Expenses list: no expenses yet (first-run), no results from current filter (vs "no expenses this month")
  - Receipt: filters match zero expenses (currently just "No expenses match these filters." — fine but could earn a small illustration)
  - Dashboard: no expenses this month
- [ ] **Loading states** — skeleton for the list, a spinner state on the keypad's live eval, optimistic UI on Save
- [ ] **Error states** — formula eval error inline (the design's mobile shows `· invalid characters`; desktop popover does not), save-failed toast, network-offline banner
- [ ] **Archived reference data on old expenses** — if a category is archived but historical expenses still reference it, the chip must still render correctly. The design doesn't show this case. Settings should preview "this category is archived — N historical expenses still use it" before allowing.
- [ ] **Inline "+ Add new…" in dropdowns** — PLAN.md D.2 deferred this to Milestone I. Needs a design: probably the existing select stub gains a footer row with `+ New category` that opens a tiny inline form.
- [ ] **Long values** — descriptions over ~60 chars, amounts over Rp 99.999.999, very long category names. The table layout truncates with ellipsis but the slide-over might wrap awkwardly.
- [ ] **Date picker** — the design shows a "Today · 11 May" button. Real picker needed: today / yesterday quick-jumps, calendar grid, keyboard nav.
- [ ] **Mobile expenses search** — header has the search icon but no search UI exists yet.
- [ ] **Per-field "last used" memory** — the design hardcodes RECENT_CATS / RECENT_METHODS arrays. The real thing reads from localStorage on mount. Make sure the chip ordering animates when it changes rather than just jumping.

## Cross-cutting polish (not blocking H or I)

- [ ] **Focus styles** — designed focus rings on every interactive element, not just `outline-none`. Tab through the entire Quick-Add flow keyboard-only.
- [ ] **Motion** — `motion/react` is in the stack but unused in the design. Slide-over and bottom sheet are the obvious wins; chip "last used" reorder is the subtle one.
- [ ] **Icons audit** — the design uses inline lucide-shaped SVGs. Swap to real `lucide-react` once we're in the actual codebase; ensure consistent stroke width.
- [ ] **Dark mode** — not in the design, not in PLAN. Defer or decide.
- [ ] **Accessibility audit** — chip contrast, especially Mandiri (light blue on dark navy) and the dim/inactive state in the receipt builder.
- [ ] **Microcopy pass** — the design uses placeholders like "What was it for?" and "Per-field last-used memory orders these chips." Final copy needs a voice (warm / dry / Bahasa-friendly?).

---

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

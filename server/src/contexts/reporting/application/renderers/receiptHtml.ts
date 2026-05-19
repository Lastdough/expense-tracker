import { Money } from '../../../../shared-kernel/money/Money.js';
import { formatMoney } from '../../../../shared-kernel/money/format.js';
import { type Receipt } from '../../domain/value-objects/Receipt.js';

export interface RenderReceiptOptions {
  readonly simple?: boolean;
}

/**
 * Renders the receipt as a self-contained HTML document used for both the
 * in-app iframe preview and the browser Print dialog. The same template
 * will back the future PDF export (Milestone H.4).
 *
 * `opts.simple` (default `true`) selects the v2.3 Simple layout. When
 * `false`, a placeholder Complex stub is returned — the Complex layout
 * itself lands on a follow-up branch.
 */
export function renderReceiptHtml(receipt: Receipt, opts: RenderReceiptOptions = {}): string {
  const simple = opts.simple !== false;
  return simple ? renderSimpleReceipt(receipt) : renderComplexStub(receipt);
}

// ─────────────────────────────────────────────────────────────────────────
// v2.3 Simple layout — letterhead with Net Owed, 3-column table
// (Description | Unpaid | Early), Pending folded into Unpaid with an
// inline `pending` tag on lines that contain Pending expenses.
// ─────────────────────────────────────────────────────────────────────────
function renderSimpleReceipt(receipt: Receipt): string {
  const title = 'Expense Receipt';
  const monthLabel = formatMonth(receipt.dateStart);
  const rangeLabel = formatDayRange(receipt.dateStart, receipt.dateEnd);
  const generatedAt = formatGeneratedAt(new Date());

  const hasLines = receipt.lines.length > 0;
  let unpaidSubtotal: Money | null = null;
  let earlySubtotal: Money | null = null;
  if (hasLines) {
    // Take the currency from a line rather than the wider `receipt.currency`
    // (which is typed `string | null`); each Money is already validated.
    const lineCurrency = receipt.lines[0]!.unpaidTotal.currency;
    unpaidSubtotal = Money.fromMinor(0n, lineCurrency);
    earlySubtotal = Money.fromMinor(0n, lineCurrency);
    for (const line of receipt.lines) {
      unpaidSubtotal = unpaidSubtotal.add(line.unpaidTotal);
      earlySubtotal = earlySubtotal.add(line.earlyTotal);
    }
  }

  const grandTotal = receipt.grandTotal;
  const grandTotalIsNegative = grandTotal !== null && grandTotal.amount < 0n;

  const body = hasLines
    ? renderSimpleBody(receipt, unpaidSubtotal!, earlySubtotal!)
    : `<p class="empty">No Unpaid or Early reimbursements in this range.</p>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>${escapeHtml(title)} — ${escapeHtml(monthLabel || rangeLabel)}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>${SIMPLE_STYLE}</style>
  </head>
  <body>
    <main class="sheet">
      <header class="letterhead">
        <div class="letterhead-left">
          <div class="eyebrow">Expense Receipt · Simple</div>
          <h1 class="title">Reimbursement${monthLabel ? ` — ${escapeHtml(monthLabel)}` : ''}</h1>
          <div class="subline">${escapeHtml(rangeLabel)}</div>
        </div>
        <div class="letterhead-right">
          <div class="eyebrow eyebrow-sm">Net owed</div>
          <div class="net-owed num${grandTotalIsNegative ? ' net-owed-neg' : ''}">
            ${grandTotal ? escapeHtml(formatMoney(grandTotal)) : '—'}
          </div>
          <div class="caption">${grandTotal ? (grandTotalIsNegative ? 'you owe them' : 'they owe you') : 'no activity'}</div>
        </div>
      </header>

      ${body}

      <footer class="page-footer">
        <span>Reimbursement${monthLabel ? ` — ${escapeHtml(monthLabel)}` : ''}</span>
        <span class="page-counter"></span>
        <span>${escapeHtml(generatedAt)}</span>
      </footer>
    </main>
  </body>
</html>`;
}

function renderSimpleBody(receipt: Receipt, unpaidSubtotal: Money, earlySubtotal: Money): string {
  const grandTotal = receipt.grandTotal!;
  const grandTotalIsNegative = grandTotal.amount < 0n;

  const rows = receipt.lines
    .map((line) => {
      const lineUnpaidHasValue = line.unpaidTotal.amount !== 0n;
      const lineEarlyHasValue = line.earlyTotal.amount !== 0n;
      return `<tr>
              <td class="desc">${escapeHtml(line.description)}</td>
              <td class="num">${lineUnpaidHasValue ? escapeHtml(formatMoney(line.unpaidTotal)) : '<span class="dash">—</span>'}</td>
              <td class="num${lineEarlyHasValue ? ' early' : ''}">${lineEarlyHasValue ? escapeHtml(formatMoney(line.earlyTotal)) : '<span class="dash">—</span>'}</td>
            </tr>`;
    })
    .join('\n');

  return `<table class="simple-table">
        <thead>
          <tr>
            <th class="desc">Description</th>
            <th class="num">Unpaid</th>
            <th class="num">Early</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
        <tfoot>
          <tr class="subtotal-row">
            <td class="subtotal-label">Subtotal</td>
            <td class="num">${escapeHtml(formatMoney(unpaidSubtotal))}</td>
            <td class="num early">${escapeHtml(formatMoney(earlySubtotal))}</td>
          </tr>
        </tfoot>
      </table>

      <section class="grand-total-block">
        <div>
          <div class="eyebrow eyebrow-sm">Net owed · Unpaid − Early</div>
          <div class="math-trace num">${escapeHtml(formatMoney(unpaidSubtotal))} − ${escapeHtml(formatMoney(earlySubtotal))}</div>
        </div>
        <div class="grand-total num${grandTotalIsNegative ? ' net-owed-neg' : ''}">${escapeHtml(formatMoney(grandTotal))}</div>
      </section>

      <div class="signed">Signed: _________________________</div>`;
}

// ─────────────────────────────────────────────────────────────────────────
// Complex stub — renders the pre-v2.3 Unpaid/Early/Net Owed table
// verbatim so `?simple=false` is URL-callable. The Complex layout (status-
// grouped, chip-decorated) ships on a follow-up branch.
// TODO: Complex layout (v2.3 follow-up)
// ─────────────────────────────────────────────────────────────────────────
function renderComplexStub(receipt: Receipt): string {
  const title = 'Reimbursement Receipt';
  const rangeLabel = `${receipt.dateStart.toISOString().slice(0, 10)} → ${receipt.dateEnd
    .toISOString()
    .slice(0, 10)}`;
  const body =
    receipt.lines.length === 0
      ? `<p class="empty">No Unpaid or Early reimbursements in this range.</p>`
      : `<table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="num">Unpaid</th>
              <th class="num">Early</th>
              <th class="num">Net Owed</th>
            </tr>
          </thead>
          <tbody>
            ${receipt.lines
              .map(
                (line) => `<tr>
                  <td>${escapeHtml(line.description)}</td>
                  <td class="num">${line.unpaidCount > 0 ? escapeHtml(formatMoney(line.unpaidTotal)) : '—'}</td>
                  <td class="num ${line.earlyCount > 0 ? 'neg' : ''}">${line.earlyCount > 0 ? '−' + escapeHtml(formatMoney(line.earlyTotal)) : '—'}</td>
                  <td class="num">${escapeHtml(formatMoney(line.total))}</td>
                </tr>`,
              )
              .join('\n')}
            <tr class="total">
              <td>Amount currently owed to you</td>
              <td></td>
              <td></td>
              <td class="num">${receipt.grandTotal ? escapeHtml(formatMoney(receipt.grandTotal)) : '—'}</td>
            </tr>
          </tbody>
        </table>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>${escapeHtml(title)} — ${escapeHtml(rangeLabel)}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>${COMPLEX_STUB_STYLE}</style>
  </head>
  <body>
    <h1>${escapeHtml(title)} <small>(Complex preview — v2.3 follow-up)</small></h1>
    <div class="range">${escapeHtml(rangeLabel)}</div>
    ${body}
  </body>
</html>`;
}

// ── Formatting helpers (locale-stable; the printable copy is in English) ──

function formatMonth(d: Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(d);
}

function formatDayRange(start: Date, end: Date): string {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `${fmt.format(start)} — ${fmt.format(end)}`;
}

function formatGeneratedAt(d: Date): string {
  const date = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(d);
  return `Generated ${date}, ${time} UTC`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─────────────────────────────────────────────────────────────────────────
// Styles. Values lifted from docs/design/v2.3/Index v2.3.html and
// docs/design/v2.3/simple-receipt.jsx. Print rules close out the Milestone H
// print-stylesheet gap in docs/design/design-todos.md.
// ─────────────────────────────────────────────────────────────────────────
const SIMPLE_STYLE = `
  :root {
    --color-ink: #0a0908;
    --color-ink-2: #44403c;
    --color-ink-3: #78716c;
    --color-paper: #fafaf7;
    --color-paper-2: #f2efe8;
    --color-line: #e3ddd0;
    --color-early: #0b4c6b;
    --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Roboto, sans-serif;
    --font-mono: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: var(--font-sans);
    color: var(--color-ink);
    background: #eeece5;
    font-size: 13px;
    line-height: 1.5;
    -webkit-text-size-adjust: 100%;
  }
  .sheet {
    background: white;
    color: var(--color-ink);
    max-width: 720px;
    margin: 24px auto;
    padding: 40px 44px 32px;
    box-shadow: 0 1px 0 rgba(0,0,0,0.05), 0 18px 40px -20px rgba(0,0,0,0.22);
    border-radius: 2px;
    position: relative;
  }

  .eyebrow {
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--color-ink-3);
  }
  .eyebrow-sm { letter-spacing: 0.14em; }
  .title {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.01em;
    margin: 4px 0 0;
    line-height: 1.15;
  }
  .subline {
    font-size: 11.5px;
    color: var(--color-ink-3);
    margin-top: 4px;
  }
  .caption {
    font-size: 11px;
    color: var(--color-ink-3);
    margin-top: 2px;
  }

  .letterhead {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 24px;
    padding-bottom: 16px;
    margin-bottom: 18px;
    border-bottom: 2px solid var(--color-ink);
  }
  .letterhead-right { text-align: right; }
  .net-owed {
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -0.01em;
    line-height: 1.1;
    margin-top: 3px;
  }
  .net-owed-neg { color: var(--color-early); }

  .num {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .simple-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
  }
  .simple-table thead th {
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--color-ink-3);
    padding: 8px 0;
    border-bottom: 1px solid var(--color-ink);
    text-align: left;
  }
  .simple-table thead th.num { text-align: right; }
  .simple-table tbody td {
    padding: 7px 0;
    border-bottom: 1px solid #ececec;
    vertical-align: top;
    font-weight: 500;
  }
  .simple-table tbody td.num { font-weight: 600; }
  .simple-table tbody td.early { color: var(--color-early); }
  .simple-table tbody td .dash { color: var(--color-line); }

  .simple-table tfoot .subtotal-row td {
    padding-top: 10px;
    padding-bottom: 6px;
    border-top: 1px solid var(--color-ink);
    border-bottom: none;
    font-weight: 800;
  }
  .simple-table tfoot .subtotal-row td.early { color: var(--color-early); }
  .simple-table tfoot .subtotal-row .subtotal-label {
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--color-ink-3);
  }

  .grand-total-block {
    border-top: 2px solid var(--color-ink);
    padding-top: 14px;
    margin-top: 18px;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
  }
  .grand-total {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.01em;
  }
  .math-trace {
    font-size: 11px;
    color: var(--color-ink-3);
    margin-top: 4px;
    text-align: left;
  }

  .signed {
    margin-top: 22px;
    font-size: 11px;
    color: var(--color-ink-3);
  }

  .page-footer {
    margin-top: 28px;
    padding-top: 10px;
    border-top: 1px solid var(--color-line);
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    font-size: 9.5px;
    color: var(--color-ink-3);
    font-family: var(--font-mono);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .page-footer .page-counter::before {
    content: "Page " counter(page) " of " counter(pages);
  }

  .empty {
    color: var(--color-ink-3);
    font-style: italic;
    text-align: center;
    padding: 28px 0;
    margin: 0;
  }

  /* ───────────────────────── @media print ─────────────────────────── */
  @page {
    size: A4 portrait;
    margin: 16mm;
  }
  @media print {
    html, body { background: white; }
    .sheet {
      box-shadow: none;
      margin: 0;
      padding: 0;
      max-width: none;
      border-radius: 0;
    }
    /* Strip on-screen sheet rounding; keep the letterhead anchored to page 1. */
    .letterhead { break-after: avoid; page-break-after: avoid; }
    /* Repeat the column header on every printed page. */
    .simple-table thead { display: table-header-group; }
    .simple-table tfoot { display: table-footer-group; }
    /* Keep table rows intact across page boundaries. */
    .simple-table tr { break-inside: avoid; page-break-inside: avoid; }
    /* Keep totals + signature together at the bottom. */
    .grand-total-block,
    .signed { break-inside: avoid; page-break-inside: avoid; }
    .net-owed-neg { color: var(--color-ink); }
    .simple-table tbody td.early,
    .simple-table tfoot td.early { color: var(--color-ink); }
    /* Footer / page counter: fixed strip at the bottom of every page. */
    .page-footer { display: none; }
    @page {
      @bottom-left {
        content: "Reimbursement receipt";
        font-family: var(--font-mono, monospace);
        font-size: 8.5pt;
        color: #78716c;
      }
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-family: var(--font-mono, monospace);
        font-size: 8.5pt;
        color: #78716c;
      }
    }
  }
`;

const COMPLEX_STUB_STYLE = `
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; padding: 2rem; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 1.4rem; margin: 0 0 .25rem; }
  h1 small { font-size: .7rem; color: #888; font-weight: 500; }
  .range { color: #555; margin-bottom: 1.5rem; font-size: .9rem; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: .55rem .75rem; border-bottom: 1px solid #e5e5e5; text-align: left; vertical-align: top; }
  th { background: #f7f7f7; font-weight: 600; font-size: .8rem; text-transform: uppercase; letter-spacing: .02em; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  tr.total td { border-top: 2px solid #1a1a1a; border-bottom: none; font-weight: 600; padding-top: .8rem; }
  .empty { color: #777; font-style: italic; padding: 1.5rem 0; }
  .neg { color: #b10202; }
  @media print { body { padding: 1cm; } th { background: transparent; } }
`;

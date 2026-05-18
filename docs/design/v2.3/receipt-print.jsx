// ─────────────────────────────────────────────────────────────────────────
// v2.2 · Receipt printing
//   <ReceiptSheet />       — a single printable A4 page (header, table, footer)
//   <PaginatedPrint />     — show the receipt broken across pages, with a
//                            repeating header on page 2+ and "Page N of M"
//   <ScreenPreview />      — what the user sees on screen (no page-breaks,
//                            shadows, colored borders OK)
//   <ExportMenu />         — the new split-button menu (PDF · CSV · Print)
//   <CsvPreview />         — monospace preview of the CSV format
//   <PrintRulesLegend />   — the print-stylesheet checklist (annotated)
// ─────────────────────────────────────────────────────────────────────────

const { useState: useStateRP } = React;

// Sections of the May 2026 receipt — grouped by status so we get clean
// subtotals on the printed page. Pending sits between Unpaid and Early.
function buildSections(expenses) {
  const groupOrder = ['s2', 's5', 's4']; // Unpaid · Pending · Early
  return groupOrder.map(sid => {
    const status = window.getStatus(sid);
    const items = expenses.filter(e => e.statusId === sid);
    const signed = sid === 's4'
      ? items.reduce((s, e) => s - e.amount, 0)    // Early is paid up-front → counts negative
      : items.reduce((s, e) => s + e.amount, 0);
    return { status, items, signed };
  }).filter(s => s.items.length);
}

// One A4-shaped sheet. Variants:
//   variant = 'page'   — full letterhead + table + footer (single-page case)
//   variant = 'first'  — letterhead + first slice of rows (top of page 1)
//   variant = 'cont'   — slim repeat header + continued rows (page 2+)
function ReceiptSheet({ variant = 'page', rows, sections, total, pageNum, pageTotal, showCropMarks = true, density = 'normal' }) {
  const isContinued = variant === 'cont';
  const isLetterhead = variant === 'page' || variant === 'first';
  const rowPadY = density === 'tight' ? 3 : 4;

  return (
    <div className="sheet" style={{ padding: '32px 32px 38px' }}>
      {showCropMarks && <div className="sheet-edge" />}
      {pageNum != null && pageTotal != null && (
        <div className="sheet-pagenum">p. {pageNum}/{pageTotal}</div>
      )}

      {/* ── Letterhead (full on first page) ───────────────────────── */}
      {isLetterhead && (
        <header style={{ borderBottom: '2px solid var(--color-ink)', paddingBottom: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-ink-3)' }}>
                Expense Receipt
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 2, letterSpacing: '-0.01em' }}>Reimbursement — May 2026</h2>
              <div style={{ fontSize: 10, color: 'var(--color-ink-3)', marginTop: 3 }}>
                Adina Putri · 1 May 2026 — 11 May 2026
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-ink-3)' }}>
                Total claim
              </div>
              <div className="num" style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1, marginTop: 2 }}>
                {window.fmtIDR(total)}
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--color-ink-3)', marginTop: 1 }}>
                {window.EXPENSES.length} expenses
              </div>
            </div>
          </div>
        </header>
      )}

      {/* ── Repeating header (page 2+) ───────────────────────────── */}
      {isContinued && (
        <header style={{
          borderBottom: '1px solid var(--color-ink-3)',
          paddingBottom: 6, marginBottom: 12,
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          fontSize: 9.5, color: 'var(--color-ink-3)',
          letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
        }}>
          <span>Reimbursement — May 2026 · Adina Putri <span style={{ opacity: 0.5, marginLeft: 8 }}>continued</span></span>
          <span className="num" style={{ color: 'var(--color-ink-2)' }}>{window.fmtIDR(total)} claim</span>
        </header>
      )}

      {/* ── Body (rows or sections) ──────────────────────────────── */}
      {sections ? sections.map(sec => (
        <SectionBlock key={sec.status.id} section={sec} rowPadY={rowPadY} />
      )) : null}

      {rows ? <RowList rows={rows} showHeader rowPadY={rowPadY} /> : null}

      {/* ── Footer (only on final page) ──────────────────────────── */}
      {variant === 'page' && (
        <FinalFooter total={total} />
      )}
    </div>
  );
}

function SectionBlock({ section, rowPadY }) {
  const { status, items, signed } = section;
  return (
    <div style={{ marginBottom: 14 }} className="avoid-break">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <window.Chip token={status} size="sm" />
          <span style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-ink-3)' }}>
            {items.length} item{items.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="num" style={{ fontSize: 11.5, fontWeight: 700, color: signed < 0 ? '#0b4c6b' : 'var(--color-ink)' }}>
          {window.fmtIDR(signed)}
        </div>
      </div>
      <div className="rcpt-grid">
        <div className="rcpt-head">Date</div>
        <div className="rcpt-head">Description</div>
        <div className="rcpt-head">Category</div>
        <div className="rcpt-head num">Amount</div>
        {items.map(it => {
          const isEarly = status.id === 's4';
          return (
            <div className={'rcpt-row contents' + (isEarly ? ' early' : '')} key={it.id} style={{ display: 'contents' }}>
              <div className="num" style={{ color: 'var(--color-ink-3)', paddingTop: rowPadY, paddingBottom: rowPadY, borderBottom: '1px solid #ececec' }}>
                {window.fmtDay(it.date)}
              </div>
              <div style={{ paddingTop: rowPadY, paddingBottom: rowPadY, borderBottom: '1px solid #ececec', fontWeight: 500 }}>
                {it.desc}
              </div>
              <div style={{ paddingTop: rowPadY, paddingBottom: rowPadY, borderBottom: '1px solid #ececec' }}>
                <window.Chip token={window.getCat(it.catId)} size="sm" />
              </div>
              <div className="num amt" style={{ paddingTop: rowPadY, paddingBottom: rowPadY, borderBottom: '1px solid #ececec', fontWeight: 600 }}>
                {isEarly ? '−' : ''}{window.fmtIDR(it.amount, { bare: true })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RowList({ rows, showHeader, rowPadY }) {
  return (
    <div className="rcpt-grid">
      {showHeader && (
        <>
          <div className="rcpt-head">Date</div>
          <div className="rcpt-head">Description</div>
          <div className="rcpt-head">Category</div>
          <div className="rcpt-head num">Amount</div>
        </>
      )}
      {rows.map(it => (
        <div key={it.id} style={{ display: 'contents' }}>
          <div className="num" style={{ color: 'var(--color-ink-3)', paddingTop: rowPadY, paddingBottom: rowPadY, borderBottom: '1px solid #ececec' }}>
            {window.fmtDay(it.date)}
          </div>
          <div style={{ paddingTop: rowPadY, paddingBottom: rowPadY, borderBottom: '1px solid #ececec', fontWeight: 500 }}>
            {it.desc}
          </div>
          <div style={{ paddingTop: rowPadY, paddingBottom: rowPadY, borderBottom: '1px solid #ececec' }}>
            <window.Chip token={window.getCat(it.catId)} size="sm" />
          </div>
          <div className="num" style={{ paddingTop: rowPadY, paddingBottom: rowPadY, borderBottom: '1px solid #ececec', fontWeight: 600 }}>
            {window.fmtIDR(it.amount, { bare: true })}
          </div>
        </div>
      ))}
    </div>
  );
}

function FinalFooter({ total }) {
  return (
    <footer style={{ borderTop: '2px solid var(--color-ink)', paddingTop: 10, marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-ink-3)' }}>
            Grand total · amount currently owed
          </div>
          <div style={{ fontSize: 9.5, color: 'var(--color-ink-3)', marginTop: 8 }}>Signed: _________________________</div>
        </div>
        <div className="num" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em' }}>
          {window.fmtIDR(total)}
        </div>
      </div>
      <div style={{ fontSize: 8.5, color: 'var(--color-ink-3)', textAlign: 'center', marginTop: 16, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        Generated from Ledger on 11 May 2026, 18:02
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ScreenPreview — what the user sees in the app (interactive)
// PaginatedPrint — same content, split across A4 pages with the tear-line
//                  visualization between sheets.
// ─────────────────────────────────────────────────────────────────────────
function ScreenPreview({ sections, total, annotate = false }) {
  return (
    <div style={{ position: 'relative' }}>
      <div className="sheet" style={{ padding: '34px 34px 40px', boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 16px 36px -16px rgba(0,0,0,0.18)' }}>
        <header style={{ borderBottom: '2px solid var(--color-ink)', paddingBottom: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-ink-3)' }}>
                Expense Receipt · Preview
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>Reimbursement — May 2026</h2>
              <div style={{ fontSize: 10, color: 'var(--color-ink-3)', marginTop: 3 }}>Adina Putri · 1 May 2026 — 11 May 2026</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-ink-3)' }}>Total claim</div>
              <div className="num" style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>{window.fmtIDR(total)}</div>
            </div>
          </div>
        </header>
        {sections.map(sec => <SectionBlock key={sec.status.id} section={sec} rowPadY={4} />)}
        <FinalFooter total={total} />
      </div>
      {annotate && (
        <div style={{ position: 'absolute', top: -10, right: -14 }}>
          <span style={{
            background: 'var(--color-paper-2)', border: '1px solid var(--color-line)',
            padding: '3px 8px', borderRadius: 999, fontSize: 10,
            fontFamily: 'var(--font-mono)', color: 'var(--color-ink-2)',
            letterSpacing: '0.05em',
          }}>
            screen · @media not print
          </span>
        </div>
      )}
    </div>
  );
}

function PaginatedPrint({ sections, total, pages = 2, annotate = false }) {
  // Split the rows across `pages` pseudo-pages. We hardcode where the page
  // break falls so the demo shows the rules in practice rather than
  // implementing layout-driven pagination.
  // Page 1: Unpaid section (mostly). Page 2: Pending + Early + footer.
  const [pg1, pg2] = [
    [sections[0]],                                 // Unpaid
    [sections[1], sections[2]].filter(Boolean),    // Pending, Early
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="sheet sheet--gap" style={{ padding: '32px 32px 24px' }}>
        <div className="sheet-edge" />
        <div className="sheet-pagenum">p. 1/{pages}</div>
        <header style={{ borderBottom: '2px solid var(--color-ink)', paddingBottom: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-ink-3)' }}>Expense Receipt</div>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>Reimbursement — May 2026</h2>
              <div style={{ fontSize: 10, color: 'var(--color-ink-3)', marginTop: 3 }}>Adina Putri · 1 May 2026 — 11 May 2026</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-ink-3)' }}>Total claim</div>
              <div className="num" style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>{window.fmtIDR(total)}</div>
              <div style={{ fontSize: 9.5, color: 'var(--color-ink-3)', marginTop: 1 }}>{window.EXPENSES.length} expenses</div>
            </div>
          </div>
        </header>
        {pg1.map(sec => <SectionBlock key={sec.status.id} section={sec} rowPadY={4} />)}
        {/* simulated foot of page 1 */}
        <div style={{ position: 'absolute', bottom: 8, left: 32, right: 32, display: 'flex', justifyContent: 'space-between', fontSize: 8.5, color: 'var(--color-ink-3)', fontFamily: 'var(--font-mono)' }}>
          <span>Reimbursement — May 2026</span>
          <span>Page 1 of {pages}</span>
        </div>
      </div>

      <div className="sheet-break"><span>page break</span></div>

      <div className="sheet" style={{ padding: '24px 32px 24px' }}>
        <div className="sheet-edge" />
        <div className="sheet-pagenum">p. 2/{pages}</div>
        <header style={{
          borderBottom: '1px solid var(--color-ink-3)',
          paddingBottom: 6, marginBottom: 12,
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          fontSize: 9.5, color: 'var(--color-ink-3)',
          letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600,
        }}>
          <span>Reimbursement — May 2026 · Adina Putri <span style={{ opacity: 0.5, marginLeft: 8 }}>continued</span></span>
          <span className="num" style={{ color: 'var(--color-ink-2)' }}>{window.fmtIDR(total)} claim</span>
        </header>
        {pg2.map(sec => <SectionBlock key={sec.status.id} section={sec} rowPadY={4} />)}
        <FinalFooter total={total} />
        <div style={{ position: 'absolute', bottom: 8, left: 32, right: 32, display: 'flex', justifyContent: 'space-between', fontSize: 8.5, color: 'var(--color-ink-3)', fontFamily: 'var(--font-mono)' }}>
          <span>Reimbursement — May 2026</span>
          <span>Page 2 of {pages}</span>
        </div>
      </div>

      {annotate && (
        <div style={{ marginTop: 14 }}>
          <span style={{
            background: 'var(--color-paper-2)', border: '1px solid var(--color-line)',
            padding: '3px 8px', borderRadius: 999, fontSize: 10,
            fontFamily: 'var(--font-mono)', color: 'var(--color-ink-2)',
            letterSpacing: '0.05em',
          }}>
            print · @media print · A4 portrait
          </span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ExportMenu — the new split button
// ─────────────────────────────────────────────────────────────────────────
function ExportMenu({ open = true }) {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div style={{ display: 'inline-flex' }}>
        <button style={{
          padding: '8px 14px', background: 'var(--color-ink)', color: 'var(--color-paper)',
          borderTopLeftRadius: 10, borderBottomLeftRadius: 10,
          fontSize: 12.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <Icon name="download" />
          Export PDF
        </button>
        <button style={{
          padding: '8px 10px', background: 'var(--color-ink-2)', color: 'var(--color-paper)',
          borderTopRightRadius: 10, borderBottomRightRadius: 10,
          borderLeft: '1px solid rgba(255,255,255,0.18)',
          display: 'inline-flex', alignItems: 'center',
        }} aria-haspopup="menu" aria-expanded={open}>
          <Icon name="chev-down" />
        </button>
      </div>
      {open && (
        <div className="menu" role="menu">
          <div className="menu-row" role="menuitem">
            <span className="ico"><Icon name="pdf" /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>Download PDF</div>
              <div style={{ fontSize: 10.5, color: 'var(--color-ink-3)' }}>For email · keeps formatting</div>
            </div>
            <span className="meta">⌘E</span>
          </div>
          <div className="menu-row" role="menuitem">
            <span className="ico"><Icon name="csv" /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>Download CSV</div>
              <div style={{ fontSize: 10.5, color: 'var(--color-ink-3)' }}>For spreadsheets · raw rows</div>
            </div>
            <span className="meta">⌘⇧E</span>
          </div>
          <div className="menu-sep" />
          <div className="menu-row" role="menuitem">
            <span className="ico"><Icon name="print" /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>Print…</div>
              <div style={{ fontSize: 10.5, color: 'var(--color-ink-3)' }}>System dialog · uses @media print</div>
            </div>
            <span className="meta">⌘P</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Icon({ name, size = 14 }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'download': return (<svg {...props}><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M5 21h14" /></svg>);
    case 'chev-down': return (<svg {...props}><path d="m6 9 6 6 6-6" /></svg>);
    case 'pdf': return (<svg {...props}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 11h6M9 15h4" /></svg>);
    case 'csv': return (<svg {...props}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M9 5v14M15 5v14" /></svg>);
    case 'print': return (<svg {...props}><path d="M6 9V3h12v6" /><rect x="4" y="9" width="16" height="9" rx="2" /><path d="M8 14h8v6H8z" /></svg>);
    default: return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// CsvPreview
// ─────────────────────────────────────────────────────────────────────────
function CsvPreview() {
  return (
    <pre className="csv">
<span className="h">date,description,category,method,status,amount_idr,raw_input</span>{`
`}<span>2026-05-02,</span><span className="q">"Grab to office (team onboarding)"</span><span>,Transportations,Gopay,Unpaid Reimbursable,</span><span className="n">78000</span><span>,</span>{`
`}<span>2026-05-04,</span><span className="q">"Lunch — onboarding lunch w/ Adi"</span><span>,Food,Mandiri,Unpaid Reimbursable,</span><span className="n">187000</span><span>,</span>{`
`}<span>2026-05-05,</span><span className="q">"Stationery — sticky notes + pens"</span><span>,Supplies,Cash,Pending Reimbursement,</span><span className="n">192500</span><span>,</span>{`
`}<span>2026-05-06,</span><span className="q">"Conference ticket reimbursed early"</span><span>,Entertainment,Mandiri,Early Reimbursement,</span><span className="n">-850000</span><span>,</span>{`
`}<span>2026-05-08,</span><span className="q">"Cab — client visit (BCA tower)"</span><span>,Transportations,BCA,Unpaid Reimbursable,</span><span className="n">96000</span><span>,</span><span className="q">"=20000+76000"</span>{`
`}<span style={{ color: 'var(--color-ink-3)' }}>… 7 more rows …</span>
    </pre>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Print rules legend — pinned to a print preview so we can label each rule
// ─────────────────────────────────────────────────────────────────────────
const PRINT_RULES = [
  { n: '1', title: 'A4 portrait, hard margins', desc: <>Every print starts with <code>@page {`{ size: A4 portrait; margin: 16mm }`}</code>. The on-screen sheet uses the same proportions so what you see is what you get.</> },
  { n: '2', title: 'Letterhead only on page 1', desc: <>Page 1: full title block. Page 2+: a slim continued-strip with the period and running total. Implemented by giving the letterhead <code>{`break-after: avoid`}</code> and the strip <code>{`display: none`}</code> outside print.</> },
  { n: '3', title: 'Keep sections together', desc: <>Each status section is wrapped in <code>{`.avoid-break { break-inside: avoid; }`}</code> so a Pending block doesn't get sliced in half across pages. Long sections fall through to the next page intact.</> },
  { n: '4', title: 'Repeating column headers', desc: <>The <code>{`<thead>`}</code> uses <code>{`display: table-header-group`}</code> so Date / Description / Category / Amount repeat at the top of each printed page automatically.</> },
  { n: '5', title: 'Drop shadows & accents', desc: <>Inside <code>{`@media print`}</code>: <code>box-shadow: none</code>, brand orange focus ring gone, status chips keep their <code>background-color</code> via <code>{`print-color-adjust: exact`}</code>.</> },
  { n: '6', title: 'Page N of M footer', desc: <>Foot of every page: period name on the left, <code>{`Page N of M`}</code> on the right. Implemented with a position-fixed footer inside the print stylesheet — invisible on screen.</> },
];

function PrintRulesLegend() {
  return (
    <div className="rule-grid">
      {PRINT_RULES.map(r => (
        <React.Fragment key={r.n}>
          <span className="num-pin">{r.n}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>{r.title}</div>
            <div style={{ fontSize: 12, color: 'var(--color-ink-2)', lineHeight: 1.55, marginTop: 2 }}>{r.desc}</div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Net-owed math display — two cards, side-by-side
// ─────────────────────────────────────────────────────────────────────────
function NetOwedComparison() {
  // Same source data; two different formulas.
  const unpaid = window.EXPENSES.filter(e => e.statusId === 's2').reduce((s, e) => s + e.amount, 0);
  const pending = window.EXPENSES.filter(e => e.statusId === 's5').reduce((s, e) => s + e.amount, 0);
  const early = window.EXPENSES.filter(e => e.statusId === 's4').reduce((s, e) => s + e.amount, 0);
  const receiptTotal = unpaid + pending - early;        // Unpaid + Pending − Early (Early is paid up-front)
  const netOwed = early - unpaid;                       // Side-rail: Early − Unpaid
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
      <FormulaCard
        tag="Receipt builder"
        title="Total claim"
        subtitle="What to invoice the company for this period."
        formula={[
          { token: 's2', label: 'Unpaid', value: unpaid },
          { op: '+' },
          { token: 's5', label: 'Pending', value: pending },
          { op: '−' },
          { token: 's4', label: 'Early', value: early },
        ]}
        result={receiptTotal}
        copy={<>An <b>Early</b> reimbursement is money <i>already paid</i> to you up-front — it reduces what's owed today. Pending items are still in flight but you expect them back, so they go on the receipt.</>}
      />
      <FormulaCard
        tag="Side rail · dashboard"
        title="Net owed"
        subtitle="Living balance shown at a glance. Just two states."
        formula={[
          { token: 's4', label: 'Early', value: early },
          { op: '−' },
          { token: 's2', label: 'Unpaid', value: unpaid },
        ]}
        result={netOwed}
        copy={<>The rail ignores <b>Pending</b> on purpose — until finance confirms, treat it as Unpaid in spirit but don't double-count it against Early balances.</>}
        negativeMeans="The company owes you."
        positiveMeans="You're holding their money."
      />
    </div>
  );
}

function FormulaCard({ tag, title, subtitle, formula, result, copy, negativeMeans, positiveMeans }) {
  return (
    <div className="artboard" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div className="sec-title">{tag}</div>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', marginTop: 2 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--color-ink-3)', marginTop: 2 }}>{subtitle}</div>

      <div style={{
        marginTop: 14, padding: '14px 14px',
        background: 'var(--color-paper)', borderRadius: 12, border: '1px solid var(--color-line)',
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, rowGap: 14,
      }}>
        {formula.map((f, i) => {
          if (f.op) return <span key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--color-ink-2)' }}>{f.op}</span>;
          return (
            <div key={i} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
              <window.Chip token={window.getStatus(f.token)} size="sm">{f.label}</window.Chip>
              <span className="num" style={{ fontSize: 13, fontWeight: 700 }}>{window.fmtIDR(f.value)}</span>
            </div>
          );
        })}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--color-ink-2)' }}>=</span>
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
          <span style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-ink-3)' }}>
            {result < 0 ? 'They owe you' : 'You owe them'}
          </span>
          <span className="num" style={{ fontSize: 18, fontWeight: 800, color: result < 0 ? '#0b4c6b' : 'var(--color-ink)' }}>
            {window.fmtIDR(result)}
          </span>
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--color-ink-2)', lineHeight: 1.55, marginTop: 12 }}>{copy}</div>
      {(negativeMeans || positiveMeans) && (
        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 10px', fontSize: 11.5, color: 'var(--color-ink-3)' }}>
          {negativeMeans && (<><span className="num" style={{ color: '#0b4c6b', fontWeight: 700 }}>− </span><span>{negativeMeans}</span></>)}
          {positiveMeans && (<><span className="num" style={{ fontWeight: 700 }}>+ </span><span>{positiveMeans}</span></>)}
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  buildSections, ReceiptSheet, ScreenPreview, PaginatedPrint,
  ExportMenu, CsvPreview, PrintRulesLegend, NetOwedComparison,
});

// ─────────────────────────────────────────────────────────────────────────
// Claude Design v2.2 — page layout
// Picks up the two leftover items from v2.1's footer:
//   • Receipt print stylesheet
//   • Pending transition note
// Plus the adjacent gaps from design-todos.md § Milestone H:
//   • CSV export sibling button
//   • Net-owed math display (Receipt total vs Side-rail Net Owed)
//
// Sections (top → bottom):
//   1. Header + lead
//   2. Export menu — split-button with PDF / CSV / Print
//   3. Screen vs print — side-by-side
//   4. Print rules — annotated against the paginated print
//   5. Net-owed math — Receipt total vs Net Owed, formula breakdown
//   6. CSV format
//   7. Pending transition — drawer strip + modal + mobile sheet
//   8. How it lands — timeline w/ note rendered
// ─────────────────────────────────────────────────────────────────────────

const { useState: useStateA22 } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "menuOpen": true,
  "noteVariant": "structured",
  "printDensity": "normal",
  "showCropMarks": true,
  "receiptMode": "simple"
}/*EDITMODE-END*/;

function App22() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const sections = window.buildSections(window.EXPENSES);
  const receiptTotal = sections.reduce((s, sec) => s + sec.signed, 0);
  const simpleRows = window.buildSimpleRows(window.EXPENSES);
  const simpleTotals = window.simpleTotals(simpleRows);
  const isSimple = t.receiptMode === 'simple';

  return (
    <div className="min-h-screen w-full">
      <TweaksPanel>
        <TweakSection label="Receipt mode">
          <TweakRadio
            label="Default"
            value={t.receiptMode}
            onChange={(v) => setTweak('receiptMode', v)}
            options={[{label: 'Simple', value: 'simple'}, {label: 'Complex', value: 'complex'}]}
          />
        </TweakSection>
        <TweakSection label="Export menu">
          <TweakToggle label="Show open" value={t.menuOpen} onChange={(v) => setTweak('menuOpen', v)} />
        </TweakSection>
        <TweakSection label="Print preview">
          <TweakToggle label="Crop marks" value={t.showCropMarks} onChange={(v) => setTweak('showCropMarks', v)} />
          <TweakRadio
            label="Row density"
            value={t.printDensity}
            onChange={(v) => setTweak('printDensity', v)}
            options={[{label: 'Normal', value: 'normal'}, {label: 'Tight', value: 'tight'}]}
          />
        </TweakSection>
        <TweakSection label="Pending modal">
          <TweakRadio
            label="Note input"
            value={t.noteVariant}
            onChange={(v) => setTweak('noteVariant', v)}
            options={[{label: 'Suggestions', value: 'structured'}, {label: 'Plain', value: 'plain'}]}
          />
        </TweakSection>
      </TweaksPanel>

      {/* Page header */}
      <header className="px-10 pt-10 pb-6 max-w-[1280px] mx-auto">
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <div>
            <div className="sec-title mb-2">Claude Design · v2.2</div>
            <h1 className="text-[34px] font-extrabold tracking-tight leading-[1.05]">Receipt printing &amp; the Pending note</h1>
            <p className="sec-sub mt-3">
              Two threads. <b className="text-ink">Receipt printing</b> closes <span className="font-mono text-[11.5px]">design-todos.md § Milestone H</span> — adds CSV and Print alongside PDF, defines the <code className="font-mono text-[11px] bg-paper-2 px-1.5 py-0.5 rounded">@media print</code> stylesheet, and pulls the two confusable "owed" numbers apart. <b className="text-ink">The Pending note</b> closes <span className="font-mono text-[11.5px]">§ Milestone G</span> — the transition asks for a note so the history reads back coherently weeks later.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-[11.5px] text-ink-3">
            <div className="flex items-center gap-2"><span className="kbd">v2.2</span><span>gap-fill on v2.1</span></div>
            <div>Period (for the demo): <span className="font-mono text-ink-2">1 — 11 May 2026</span></div>
          </div>
        </div>
      </header>

      {/* ── 1. Export menu ───────────────────────────────────────── */}
      <SectionWrap22 id="export"
        title="Export menu"
        subtitle="Pass 1 only had a single Export PDF button. v2.2 turns it into a split-button: primary action stays PDF (the default everyone uses), the chevron opens CSV and Print as siblings. Same filter state drives all three formats."
      >
        <div className="grid grid-cols-[1fr_auto] gap-12 items-start mt-7">
          {/* Mock header bar */}
          <div>
            <ArtboardLabel22>Receipt header · desktop</ArtboardLabel22>
            <div className="artboard" style={{ padding: '14px 20px', marginTop: 8 }}>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="sec-title">Receipt export</div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2, letterSpacing: '-0.01em' }}>Build a receipt</div>
                </div>
                <div className="flex items-center gap-2">
                  <button style={{
                    padding: '7px 12px', borderRadius: 10, border: '1px solid var(--color-line)', background: 'white',
                    fontSize: 12.5, fontWeight: 500, color: 'var(--color-ink-2)',
                  }}>Save preset</button>
                  <window.ExportMenu open={t.menuOpen} />
                </div>
              </div>
            </div>
            <Help22 className="mt-3">
              Primary action stays PDF — the format 90% of users want. CSV and Print sit one click away in the dropdown.
              Both share the same builder filters; both run the same{' '}
              <code className="font-mono text-[11px]">/api/reports/receipt</code> endpoint with a different <code className="font-mono text-[11px]">format=</code> param.
            </Help22>
          </div>

          {/* Format choice rationale */}
          <div className="artboard" style={{ padding: 18, minWidth: 280, maxWidth: 320 }}>
            <div className="sec-title mb-2">Three formats, three jobs</div>
            <ChoiceRow icon="pdf" name="PDF" why="What goes in the email to finance. Locked formatting, page numbers, signatures." />
            <ChoiceRow icon="csv" name="CSV" why="What goes into the user's own bookkeeping spreadsheet. One row per expense, raw values." />
            <ChoiceRow icon="print" name="Print" why="Hard copies for the rare in-person submission. Same stylesheet as PDF, just routes through the browser dialog." />
          </div>
        </div>
      </SectionWrap22>

      {/* ── 2. Screen vs print ──────────────────────────────────── */}
      <SectionWrap22 id="screen-vs-print"
        title="Screen vs. print"
        subtitle={isSimple
          ? 'Simple mode strips the receipt to the three columns most people actually settle on: description, what is unpaid, what was paid early. Net Owed at the bottom is the bottom line. Pending items fold into Unpaid — same posture, less ceremony.'
          : 'The screen preview is the editable workbench. Print mode is the deliverable. They render from the same component tree, but @media print swaps colors, kills shadows, paginates, and adds the running header.'
        }
      >
        <ModeToggle22 value={t.receiptMode} onChange={(v) => setTweak('receiptMode', v)} />
        <div className="grid grid-cols-2 gap-10 mt-6 items-start">
          <div>
            <ArtboardLabel22 className="mb-3">Screen · Receipt.tsx</ArtboardLabel22>
            {isSimple
              ? <window.SimpleScreenPreview rows={simpleRows} totals={simpleTotals} annotate />
              : <window.ScreenPreview sections={sections} total={receiptTotal} annotate />
            }
            <Help22 className="mt-4">
              {isSimple
                ? <>The simple sheet drops dates, categories, methods, and the status grouping. One row per expense; amount lands in <b className="text-ink">Unpaid</b> or <b className="text-ink">Early</b>; Pending gets a tiny inline tag so you can still spot it without giving up a whole column.</>
                : <>The screen layout keeps the warm-paper background, drop shadow, status accent colors on every chip, and the hover/focus rings. Edits land here.</>
              }
            </Help22>
          </div>
          <div>
            <ArtboardLabel22 className="mb-3">Print · same DOM, different stylesheet</ArtboardLabel22>
            {isSimple
              ? <window.SimplePaginated rows={simpleRows} totals={simpleTotals} annotate />
              : <window.PaginatedPrint sections={sections} total={receiptTotal} pages={2} annotate />
            }
            <Help22 className="mt-4">
              {isSimple
                ? <>Simple receipts almost always fit on a single A4 page — there is no per-row category chip and no section breaks to budget for. The print stylesheet rules still apply (no shadows, exact chip colors), they just have less to do.</>
                : <>Print mode lays out two A4 portrait pages. The letterhead appears once; page 2 onward gets the slim continued-strip. Each status section travels as a unit, so subtotals never get orphaned.</>
              }
            </Help22>
          </div>
        </div>
      </SectionWrap22>

      {/* ── 3. Print rules ──────────────────────────────────────── */}
      <SectionWrap22 id="print-rules"
        title="Print stylesheet · the six rules"
        subtitle="Everything that's different about @media print, with the property to look for in receipt.css. If you change a print rule, change the rule listed here at the same time so this page stays accurate."
      >
        <div className="mt-7 grid grid-cols-[1fr_360px] gap-12 items-start">
          <window.PrintRulesLegend />
          <div>
            <ArtboardLabel22 className="mb-3">Print stylesheet · in one block</ArtboardLabel22>
            <pre className="csv" style={{ fontSize: 10.5 }}>
{`@page {
  size: A4 portrait;
  margin: 16mm;
}

@media print {
  :root { color-adjust: exact; }

  body, .sheet {
    background: white;
    box-shadow: none;
    border-radius: 0;
  }

  /* Each status block stays whole */
  .rcpt-section {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  /* Letterhead only on page 1 */
  .letterhead { break-after: avoid; }
  .running-head { display: block; }

  /* Repeating table headers */
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }

  /* Running footer */
  .print-foot {
    position: fixed; bottom: 8mm;
    left: 16mm; right: 16mm;
    display: flex; justify-content: space-between;
  }
  .print-foot .pageno::after {
    content: 'Page ' counter(page)
      ' of ' counter(pages);
  }

  /* Keep chip colors on paper */
  .chip {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}`}</pre>
          </div>
        </div>
      </SectionWrap22>

      {/* ── 4. Net-owed math ────────────────────────────────────── */}
      <SectionWrap22 id="net-owed"
        title="Two numbers, two meanings"
        subtitle="The dashboard rail and the receipt builder used to show similarly-shaped totals that meant different things. v2.2 makes the formulas explicit and labels the unit each carries."
      >
        <window.NetOwedComparison />
        <Help22 className="mt-4">
          <b className="text-ink">Why they diverge.</b>{' '}
          The Receipt total is "what I'm asking for back this period" — Pending is included because you expect those reimbursements, but Early payments already credit you so they subtract. The Net Owed number on the rail is the running balance with finance, which depends only on confirmed transitions: Early (you got money) minus Unpaid (you're carrying their cost).
        </Help22>
      </SectionWrap22>

      {/* ── 5. CSV format ───────────────────────────────────────── */}
      <SectionWrap22 id="csv"
        title="CSV format"
        subtitle="The CSV export hits Excel, Google Sheets, and the user's own ledger. Stable column order, ISO dates, integer minor units already collapsed to IDR units. Raw formula input is preserved in its own column so the user can re-import if they ever want to."
      >
        <div className="grid grid-cols-[1.4fr_1fr] gap-10 mt-7 items-start">
          <window.CsvPreview />
          <div className="text-[12.5px] text-ink-2 leading-relaxed flex flex-col gap-3">
            <p><b className="text-ink">Column order is contract.</b> Don't reorder once we ship — third-party importers will hard-code positions.</p>
            <p><b className="text-ink">Money columns are bare integers</b> in the smallest unit the currency tolerates (IDR has no minor unit, so it's whole rupiah). The <code className="font-mono text-[11px]">currency</code> column says <code className="font-mono text-[11px]">IDR</code>; readers do their own formatting.</p>
            <p><b className="text-ink">Description gets the quote treatment</b> because commas and em-dashes show up in expense names constantly.</p>
            <p><b className="text-ink">Raw input preserved.</b> If the original was <code className="font-mono text-[11px]">=20000+76000</code>, that's in <code className="font-mono text-[11px]">raw_input</code> — so the formula survives a round-trip through Sheets.</p>
            <p className="text-ink-3 pt-2 border-t border-line">Filename: <code className="font-mono text-[11px]">receipt_2026-05-01_2026-05-11.csv</code> (period span, fixed shape — easy to glob).</p>
          </div>
        </div>
      </SectionWrap22>

      {/* ── 6. Pending transition ───────────────────────────────── */}
      <SectionWrap22 id="pending"
        title="Pending transition · note required"
        subtitle="When you mark an expense Pending you're saying 'I've handed this off — to finance, to a teammate, to a portal — and I'm waiting.' The history is the only place that record can live. Capture it once, here, instead of mining the chat history three weeks later."
      >
        <div className="mt-7 grid grid-cols-[1fr_460px] gap-10 items-start">
          <div className="flex flex-col gap-6">
            <window.PendingDrawerStrip activeTrigger="pending" />

            {/* Mobile sheet variant */}
            <div>
              <ArtboardLabel22 className="mb-2">Mobile · bottom sheet</ArtboardLabel22>
              <MobileSheetFrame22>
                <window.PendingModal variant="mobile-sheet" expense={window.EXPENSES[4]} />
              </MobileSheetFrame22>
            </div>
          </div>

          {/* Desktop modal — pinned right */}
          <div>
            <ArtboardLabel22 className="mb-2">Desktop · transition modal</ArtboardLabel22>
            <div style={{
              position: 'relative', borderRadius: 18, padding: 28,
              background: 'rgba(40,30,20,0.20)',
              backgroundImage: 'repeating-linear-gradient(135deg, rgba(0,0,0,0.05) 0 6px, rgba(0,0,0,0.0) 6px 12px)',
              display: 'flex', justifyContent: 'center',
            }}>
              <window.PendingModal expense={window.EXPENSES[4]} />
            </div>
            <Help22 className="mt-3">
              Note is required. Recent-note chips fill in for the user who types the same phrase every month. Submitted-on defaults to today, but is editable so back-dating actually works.
            </Help22>
          </div>
        </div>
      </SectionWrap22>

      {/* ── 7. How it lands ─────────────────────────────────────── */}
      <SectionWrap22 id="lands"
        title="How it lands"
        subtitle="After you save, the note is what the history reads — it's not a checkbox, it's the words you'd want to see on the row a month from now."
      >
        <div className="mt-7 grid grid-cols-2 gap-10">
          <window.PendingHistory />
          <div className="flex flex-col gap-4 text-[12.5px] leading-relaxed text-ink-2">
            <p><b className="text-ink">Where the note shows.</b> Inline on the timeline as a small bordered card; also rendered as the secondary line on the Pending status chip in the list view (<i>"Pending · awaiting Adi"</i>).</p>
            <p><b className="text-ink">Where it doesn't.</b> Not on the receipt PDF — that's a separate concern (private to you, not for finance). Not in the CSV export by default (column exists, opt-in).</p>
            <p><b className="text-ink">When the next transition happens</b> (Pending → Paid), this card gets pinned to the top of the history and rendered with a struck-through indicator. The note never gets edited or deleted — it's an immutable journal entry.</p>
            <p><b className="text-ink">No note? No transition.</b> The state machine returns <code className="font-mono text-[11px]">Result.err(PendingNoteRequired)</code> if the modal is bypassed via API. Frontend can't submit until the textarea has at least one character.</p>
          </div>
        </div>
      </SectionWrap22>

      <footer className="px-10 py-10 max-w-[1280px] mx-auto text-[11.5px] text-ink-3 border-t border-line/60 mt-12">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>Claude Design v2.2 · closes Milestone H (print stylesheet · CSV · net-owed math) and the Pending note item from Milestone G. See <span className="font-mono">design-todos.md</span>.</div>
          <div>Next pass: <span className="font-mono">v2.3</span> — Empty / loading / error states across the app.</div>
        </div>
      </footer>
    </div>
  );
}

// ─── Layout primitives (mirrors v2.1) ─────────────────────────────────────
function SectionWrap22({ id, title, subtitle, children }) {
  return (
    <section id={id} className="px-10 py-9 max-w-[1280px] mx-auto border-t border-line/60">
      <div className="flex items-baseline gap-5">
        <h2 className="sec-h2">{title}</h2>
      </div>
      {subtitle && <p className="sec-sub mt-2">{subtitle}</p>}
      {children}
    </section>
  );
}

function ArtboardLabel22({ children, className = '' }) {
  return <div className={'artboard-label ' + className}>{children}</div>;
}

// Pill-shaped Simple / Complex toggle. Inherits posture from Pass 1's
// mobile/desktop pill; active state uses the ink color the rest of v2.3
// already reserves for primary actions.
function ModeToggle22({ value, onChange }) {
  const opts = [
    { id: 'simple',  label: 'Simple',  hint: '3 cols · net owed' },
    { id: 'complex', label: 'Complex', hint: 'sections · chips · dates' },
  ];
  const active = opts.find(o => o.id === value) || opts[0];
  return (
    <div className="flex items-center gap-3 flex-wrap mt-5">
      <span className="sec-title">Receipt complexity</span>
      <div className="mode-toggle" role="tablist" aria-label="Receipt complexity">
        {opts.map(o => (
          <button
            key={o.id}
            role="tab"
            aria-selected={value === o.id}
            className={value === o.id ? 'on' : ''}
            onClick={() => onChange(o.id)}
          >
            <span className="dot" />
            {o.label}
          </button>
        ))}
      </div>
      <span style={{ fontSize: 11.5, color: 'var(--color-ink-3)', fontFamily: 'var(--font-mono)' }}>
        → {active.hint}
      </span>
    </div>
  );
}

function Help22({ children, className = '' }) {
  return <p className={`mt-3 text-[12px] text-ink-3 leading-relaxed max-w-[68ch] ${className}`}>{children}</p>;
}

function ChoiceRow({ icon, name, why }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--color-line)' }}>
      <span style={{
        width: 28, height: 28, borderRadius: 8, background: 'var(--color-paper)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ink-2)', flexShrink: 0,
      }}>
        <IconLocal name={icon} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{name}</div>
        <div style={{ fontSize: 11.5, color: 'var(--color-ink-3)', lineHeight: 1.5 }}>{why}</div>
      </div>
    </div>
  );
}

function IconLocal({ name, size = 14 }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'pdf': return (<svg {...props}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 11h6M9 15h4" /></svg>);
    case 'csv': return (<svg {...props}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M9 5v14M15 5v14" /></svg>);
    case 'print': return (<svg {...props}><path d="M6 9V3h12v6" /><rect x="4" y="9" width="16" height="9" rx="2" /><path d="M8 14h8v6H8z" /></svg>);
    default: return null;
  }
}

function MobileSheetFrame22({ children }) {
  return (
    <div style={{
      background: 'var(--color-ink)', borderRadius: 36, padding: 10,
      boxShadow: '0 24px 60px -24px rgba(40,30,20,0.45)',
      width: 320,
    }}>
      <div style={{ background: 'var(--color-paper)', borderRadius: 28, overflow: 'hidden', position: 'relative', minHeight: 580 }}>
        {/* Faux page behind */}
        <div style={{ padding: 18 }}>
          <div className="sec-title">Expense Detail</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>Stationery — sticky notes + pens</h3>
          <div style={{ marginTop: 10, height: 50, borderRadius: 12, background: 'white', border: '1px solid var(--color-line)' }} />
          <div style={{ marginTop: 8, height: 50, borderRadius: 12, background: 'white', border: '1px solid var(--color-line)' }} />
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,9,8,0.30)' }} />
        <div style={{
          position: 'absolute', inset: '160px 0 0', background: 'var(--color-paper)',
          borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden',
          boxShadow: '0 -8px 24px -8px rgba(40,30,20,0.25)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, paddingBottom: 4 }}>
            <div style={{ width: 36, height: 4, borderRadius: 999, background: 'var(--color-line)' }} />
          </div>
          <div style={{ padding: '4px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Mark as Pending</div>
            <button style={{ fontSize: 12, color: 'var(--color-ink-3)' }}>Cancel</button>
          </div>
          <div style={{ padding: '6px 14px 14px' }}>
            {children}
          </div>
          <div style={{ padding: '0 14px 14px' }}>
            <button style={{
              width: '100%', padding: '11px 0', borderRadius: 12,
              background: 'var(--color-ink)', color: 'var(--color-paper)',
              fontSize: 13, fontWeight: 700,
            }}>Mark as Pending</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const root22 = ReactDOM.createRoot(document.getElementById('root'));
root22.render(<App22 />);

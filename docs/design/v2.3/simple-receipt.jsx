// ─────────────────────────────────────────────────────────────────────────
// v2.3 · Simple receipt
//   A stripped-down receipt with only the three columns the user actually
//   cares about when settling at month-end:
//      Description · Unpaid · Early
//   …plus a single Net Owed total at the bottom (Unpaid − Early).
//
//   Pending items fold into Unpaid (you're still waiting for them, so for
//   the purposes of "what do I want back?" they behave the same).
//
//   <SimpleScreenPreview /> — screen variant
//   <SimplePaginated />     — print variant (single page, almost always
//                             fits because the table is so much narrower)
// ─────────────────────────────────────────────────────────────────────────

// Roll up expenses into Simple-receipt rows. Each row gets either an
// Unpaid amount or an Early amount, never both.
function buildSimpleRows(expenses) {
  return expenses.map(e => {
    const isEarly = e.statusId === 's4';
    return {
      id: e.id,
      desc: e.desc,
      unpaid: isEarly ? 0 : e.amount,   // Unpaid + Pending both land here
      early: isEarly ? e.amount : 0,
      wasPending: e.statusId === 's5',
    };
  });
}

function simpleTotals(rows) {
  const unpaid = rows.reduce((s, r) => s + r.unpaid, 0);
  const early = rows.reduce((s, r) => s + r.early, 0);
  return { unpaid, early, netOwed: unpaid - early };
}

// ── Shared body: header + 3-column table + totals ──────────────────────────
function SimpleReceiptBody({ rows, totals, showLetterhead = true, annotate = false }) {
  return (
    <>
      {showLetterhead && (
        <header style={{ borderBottom: '2px solid var(--color-ink)', paddingBottom: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-ink-3)' }}>
                Expense Receipt · Simple
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginTop: 2, letterSpacing: '-0.01em' }}>
                Reimbursement — May 2026
              </h2>
              <div style={{ fontSize: 10, color: 'var(--color-ink-3)', marginTop: 3 }}>
                Adina Putri · 1 May 2026 — 11 May 2026
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-ink-3)' }}>
                Net owed
              </div>
              <div className="num" style={{
                fontSize: 20, fontWeight: 800, lineHeight: 1.1, marginTop: 2,
                color: totals.netOwed < 0 ? '#0b4c6b' : 'var(--color-ink)',
              }}>
                {window.fmtIDR(totals.netOwed)}
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--color-ink-3)', marginTop: 1 }}>
                {totals.netOwed < 0 ? 'they owe you' : 'you owe them'}
              </div>
            </div>
          </div>
        </header>
      )}

      <div className="simple-grid">
        <div className="rcpt-head">Description</div>
        <div className="rcpt-head num">Unpaid</div>
        <div className="rcpt-head num">Early</div>

        {rows.map(r => (
          <div key={r.id} style={{ display: 'contents' }}>
            <div style={{ paddingTop: 5, paddingBottom: 5, borderBottom: '1px solid #ececec', fontWeight: 500 }}>
              {r.desc}
              {r.wasPending && (
                <span style={{
                  fontSize: 8.5, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: 'var(--color-ink-3)', fontFamily: 'var(--font-mono)',
                  marginLeft: 6, padding: '1px 5px', borderRadius: 4,
                  background: 'var(--color-paper-2)',
                }}>pending</span>
              )}
            </div>
            <div className="num" style={{ paddingTop: 5, paddingBottom: 5, borderBottom: '1px solid #ececec', fontWeight: 600 }}>
              {r.unpaid ? window.fmtIDR(r.unpaid, { bare: true }) : <span style={{ color: 'var(--color-line)' }}>—</span>}
            </div>
            <div className="num" style={{ paddingTop: 5, paddingBottom: 5, borderBottom: '1px solid #ececec', fontWeight: 600, color: r.early ? '#0b4c6b' : 'inherit' }}>
              {r.early ? window.fmtIDR(r.early, { bare: true }) : <span style={{ color: 'var(--color-line)' }}>—</span>}
            </div>
          </div>
        ))}

        {/* Subtotal row */}
        <div style={{ paddingTop: 8, paddingBottom: 4, borderTop: '1px solid var(--color-ink)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-ink-3)' }}>
          Subtotal
        </div>
        <div className="num" style={{ paddingTop: 8, paddingBottom: 4, borderTop: '1px solid var(--color-ink)', fontWeight: 800 }}>
          {window.fmtIDR(totals.unpaid, { bare: true })}
        </div>
        <div className="num" style={{ paddingTop: 8, paddingBottom: 4, borderTop: '1px solid var(--color-ink)', fontWeight: 800, color: '#0b4c6b' }}>
          {window.fmtIDR(totals.early, { bare: true })}
        </div>
      </div>

      <footer style={{ borderTop: '2px solid var(--color-ink)', paddingTop: 12, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--color-ink-3)' }}>
              Net owed · Unpaid − Early
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-ink-3)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
              {window.fmtIDR(totals.unpaid, { bare: true })} − {window.fmtIDR(totals.early, { bare: true })}
            </div>
          </div>
          <div className="num" style={{
            fontSize: 24, fontWeight: 800, letterSpacing: '-0.01em',
            color: totals.netOwed < 0 ? '#0b4c6b' : 'var(--color-ink)',
          }}>
            {window.fmtIDR(totals.netOwed)}
          </div>
        </div>
        <div style={{ fontSize: 9.5, color: 'var(--color-ink-3)', marginTop: 14 }}>Signed: _________________________</div>
        <div style={{ fontSize: 8.5, color: 'var(--color-ink-3)', textAlign: 'center', marginTop: 18, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Generated from Ledger on 11 May 2026, 18:02
        </div>
      </footer>
    </>
  );
}

function SimpleScreenPreview({ rows, totals, annotate = false }) {
  return (
    <div style={{ position: 'relative' }}>
      <div className="sheet" style={{ padding: '34px 34px 40px', boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 16px 36px -16px rgba(0,0,0,0.18)' }}>
        <SimpleReceiptBody rows={rows} totals={totals} />
      </div>
      {annotate && (
        <div style={{ position: 'absolute', top: -10, right: -14 }}>
          <span style={{
            background: 'var(--color-paper-2)', border: '1px solid var(--color-line)',
            padding: '3px 8px', borderRadius: 999, fontSize: 10,
            fontFamily: 'var(--font-mono)', color: 'var(--color-ink-2)',
            letterSpacing: '0.05em',
          }}>
            screen · simple mode
          </span>
        </div>
      )}
    </div>
  );
}

function SimplePaginated({ rows, totals, annotate = false }) {
  // Simple receipt is short enough to always fit on one page. Show as
  // a single sheet with crop marks + page number to match the complex
  // variant's print preview.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="sheet" style={{ padding: '32px 32px 28px' }}>
        <div className="sheet-edge" />
        <div className="sheet-pagenum">p. 1/1</div>
        <SimpleReceiptBody rows={rows} totals={totals} />
        <div style={{ position: 'absolute', bottom: 8, left: 32, right: 32, display: 'flex', justifyContent: 'space-between', fontSize: 8.5, color: 'var(--color-ink-3)', fontFamily: 'var(--font-mono)' }}>
          <span>Reimbursement — May 2026</span>
          <span>Page 1 of 1</span>
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
            print · simple mode · A4 portrait
          </span>
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  buildSimpleRows, simpleTotals,
  SimpleScreenPreview, SimplePaginated,
});

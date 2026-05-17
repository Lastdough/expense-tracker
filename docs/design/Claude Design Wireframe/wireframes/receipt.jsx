// Receipt export — the "what am I owed" view.
// V1: Builder + live preview side-by-side
// V2: Stepper (range → preview → export)
// V3: Document-first w/ controls in margin

function ReceiptDoc({ compact }) {
  const rows = [
    { desc: 'Grab to office (team)', count: 4, total: 312000, type: 'Unpaid' },
    { desc: 'Stationery for team', count: 1, total: 192500, type: 'Pending' },
    { desc: 'Lunch — onboarding', count: 1, total: 187000, type: 'Unpaid' },
    { desc: 'Conference ticket', count: 1, total: -850000, type: 'Early' },
    { desc: 'Internet — May (50%)', count: 1, total: 170000, type: 'Unpaid' },
  ];
  const net = rows.reduce((s, r) => s + r.total, 0);
  return (
    <div style={{
      background: '#fff', border: `1.5px solid ${INK}`,
      padding: compact ? 16 : 24, borderRadius: 4,
      fontFamily: 'Georgia, serif',
      boxShadow: '3px 3px 0 ' + INK,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ borderBottom: `2px solid ${INK}`, paddingBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>Reimbursement Receipt</div>
          <div style={{ fontSize: 11, color: INK_SOFT }}>1 — 11 May 2026 · prepared 11 May, 18:02</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11, color: INK_SOFT, fontFamily: 'JetBrains Mono, monospace' }}>RX-2026-05-001</div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${INK}` }}>
            <th style={{ textAlign: 'left', padding: '6px 4px', fontWeight: 700, fontFamily: 'inherit', fontSize: 10.5, letterSpacing: 0.3, textTransform: 'uppercase' }}>Description</th>
            <th style={{ textAlign: 'right', padding: '6px 4px', fontWeight: 700, fontFamily: 'inherit', fontSize: 10.5, letterSpacing: 0.3, textTransform: 'uppercase' }}>Count</th>
            <th style={{ textAlign: 'right', padding: '6px 4px', fontWeight: 700, fontFamily: 'inherit', fontSize: 10.5, letterSpacing: 0.3, textTransform: 'uppercase' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: `1px dotted ${INK_SOFT}` }}>
              <td style={{ padding: '6px 4px' }}>
                {r.desc}{' '}
                <span style={{ fontSize: 10, color: r.total < 0 ? '#0b4c6b' : INK_SOFT, fontFamily: 'inherit' }}>· {r.type}</span>
              </td>
              <td style={{ textAlign: 'right', padding: '6px 4px', fontFamily: 'JetBrains Mono, monospace' }}>{r.count}</td>
              <td style={{ textAlign: 'right', padding: '6px 4px', fontFamily: 'JetBrains Mono, monospace', color: r.total < 0 ? '#0b4c6b' : INK }}>
                {r.total < 0 ? '(' + fmtIDR(-r.total) + ')' : fmtIDR(r.total)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: `2px solid ${INK}` }}>
            <td style={{ padding: '8px 4px', fontWeight: 700 }} colSpan={2}>Net owed to me</td>
            <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 14 }}>{fmtIDR(net)}</td>
          </tr>
        </tfoot>
      </table>

      <div style={{ fontSize: 10, color: INK_SOFT, fontStyle: 'italic', marginTop: 4 }}>
        Negative entries are Early reimbursements (cash received in advance) — they reduce what you're owed.
      </div>
    </div>
  );
}

// ─── V1: Builder + preview side-by-side ───────────────────────────────────
function ReceiptBuilder() {
  return (
    <DesktopFrame label="A · Builder + live preview" width={1180} height={720}>
      <div style={{ height: '100%', display: 'flex' }}>
        {/* Builder */}
        <div style={{ width: 340, borderRight: `1.5px solid ${INK}`, padding: 18, display: 'flex', flexDirection: 'column', gap: 14, background: PAPER_2 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.4 }}>Receipt export</div>
            <div style={{ fontFamily: 'Caveat, cursive', fontSize: 15, color: INK_SOFT }}>what your reimbursers owe you</div>
          </div>
          <FieldStub label="period" value="1 May — 11 May 2026" />
          <div>
            <div style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: INK_SOFT, marginBottom: 3 }}>include statuses</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {STATUSES.filter(s => s.name !== 'Non-Reimbursable' && s.name !== 'Paid Reimbursable').map((s, i) => (
                <label key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 13, height: 13, border: `1.5px solid ${INK}`, borderRadius: 3, background: i === 3 ? 'transparent' : INK, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: PAPER, fontSize: 9 }}>{i !== 3 ? '✓' : ''}</span>
                  <Chip token={s} size="sm" />
                </label>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: INK_SOFT, marginBottom: 3 }}>group by</div>
            <div style={{ display: 'flex', gap: 4, fontSize: 11 }}>
              {['description', 'category', 'method'].map((g, i) => (
                <span key={g} style={{
                  border: `1.5px solid ${INK}`, padding: '4px 10px', borderRadius: 999,
                  background: i === 0 ? INK : '#fff', color: i === 0 ? PAPER : INK,
                }}>{g}</span>
              ))}
            </div>
          </div>
          <Scribble />
          <div>
            <div style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: INK_SOFT, marginBottom: 4 }}>export as</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Btn>⤓ Download PDF</Btn>
              <Btn>⤓ Download CSV</Btn>
              <Btn>🖨 Print</Btn>
            </div>
          </div>
          <div style={{ marginTop: 'auto', fontSize: 11, color: INK_SOFT, fontFamily: 'Caveat, cursive', fontSize: 14 }}>
            HTML view = PDF view = print view (one template).
          </div>
        </div>
        {/* Preview */}
        <div style={{ flex: 1, padding: '22px 32px', background: PAPER_2, overflow: 'auto' }}>
          <div style={{ fontSize: 10, color: INK_SOFT, marginBottom: 6, letterSpacing: 0.4, textTransform: 'uppercase' }}>preview · A4 portrait</div>
          <ReceiptDoc />
        </div>
      </div>
    </DesktopFrame>
  );
}

// ─── V2: Stepper ──────────────────────────────────────────────────────────
function ReceiptStepper() {
  const steps = ['Period', 'Filters', 'Preview', 'Export'];
  return (
    <DesktopFrame label="B · Step-by-step wizard" width={1180} height={720}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px 30px' }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.4 }}>Receipt export</div>
        <div style={{ fontFamily: 'Caveat, cursive', fontSize: 15, color: INK_SOFT, marginBottom: 16 }}>step 3 of 4 · preview</div>

        {/* steps strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 24, height: 24, borderRadius: 999,
                  border: `1.5px solid ${INK}`,
                  background: i < 2 ? INK : i === 2 ? '#fff' : '#fff',
                  color: i < 2 ? PAPER : INK,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                }}>{i < 2 ? '✓' : i + 1}</span>
                <span style={{ fontSize: 12, fontWeight: i === 2 ? 700 : 500, color: i === 2 ? INK : INK_SOFT }}>{s}</span>
              </div>
              {i < steps.length - 1 && <div style={{ flex: 1, height: 1.5, background: i < 2 ? INK : INK_SOFT, opacity: i < 2 ? 1 : 0.5 }} />}
            </React.Fragment>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 22, flex: 1, overflow: 'hidden' }}>
          <div style={{ overflow: 'auto', paddingRight: 6 }}><ReceiptDoc /></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Looks right?</div>
            <div style={{ color: INK_SOFT, lineHeight: 1.5 }}>You're including <b>Unpaid</b>, <b>Early</b>, and <b>Pending</b> reimbursements for the May period. Early entries appear as negatives — the grand total is what's currently owed to you.</div>
            <Box style={{ padding: 10, background: PAPER_2 }}>
              <div style={{ fontFamily: 'Caveat, cursive', fontSize: 13, color: INK_SOFT }}>grand total</div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace' }}>{fmtIDR(11500)}</div>
            </Box>
            <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
              <Btn style={{ flex: 1 }}>← Back</Btn>
              <Btn primary style={{ flex: 1 }}>Next →</Btn>
            </div>
          </div>
        </div>
      </div>
    </DesktopFrame>
  );
}

// ─── V3: Document-first w/ margin controls ────────────────────────────────
function ReceiptDocFirst() {
  return (
    <DesktopFrame label="C · Document-first (controls in margin)" width={1180} height={720}>
      <div style={{ height: '100%', display: 'flex', background: PAPER_2 }}>
        {/* Left margin: properties */}
        <div style={{ width: 240, padding: '20px 16px', borderRight: `1px dashed ${INK_SOFT}`, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Receipt</div>
          <div><div style={{ color: INK_SOFT, fontSize: 10 }}>PERIOD</div><div>1—11 May 2026</div></div>
          <div><div style={{ color: INK_SOFT, fontSize: 10 }}>ENTRIES</div><div>8 rows · grouped by description</div></div>
          <div><div style={{ color: INK_SOFT, fontSize: 10 }}>STATUSES</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 3 }}>
              <Chip token={byName(STATUSES, 'Unpaid Reimbursable')} size="sm" />
              <Chip token={byName(STATUSES, 'Early Reimbursement')} size="sm" />
              <Chip token={byName(STATUSES, 'Pending Reimbursement')} size="sm" />
            </div>
          </div>
          <Anno arrow="down" style={{ marginTop: 4 }}>change & receipt re-renders live</Anno>
        </div>

        {/* Paper */}
        <div style={{ flex: 1, padding: 30, overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 560 }}>
            <ReceiptDoc />
            <div style={{ marginTop: 10, fontFamily: 'Caveat, cursive', fontSize: 14, color: INK_SOFT, textAlign: 'center' }}>page 1 of 1</div>
          </div>
        </div>

        {/* Right margin: actions */}
        <div style={{ width: 170, padding: '20px 14px', borderLeft: `1px dashed ${INK_SOFT}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Btn small primary>⤓ PDF</Btn>
          <Btn small>⤓ CSV</Btn>
          <Btn small>🖨 Print</Btn>
          <Scribble style={{ margin: '8px 0' }} />
          <div style={{ fontSize: 10, color: INK_SOFT, lineHeight: 1.5 }}>
            All three formats render the same HTML.
          </div>
          <div style={{ marginTop: 'auto', fontSize: 10, color: INK_SOFT }}>
            <div>Format</div>
            <div>A4 portrait ▾</div>
          </div>
        </div>
      </div>
    </DesktopFrame>
  );
}

Object.assign(window, { ReceiptBuilder, ReceiptStepper, ReceiptDocFirst });

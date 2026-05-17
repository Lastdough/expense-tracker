// Expense detail / edit — 3 variations.
// V1: Mobile bottom-sheet edit (slides up over list)
// V2: Desktop slide-over panel (right side, list dimmed behind)
// V3: Dedicated edit page with reimbursement timeline

function ReimbStateMachine({ current = 'Unpaid Reimbursable', compact }) {
  const states = ['Non-Reimbursable', 'Unpaid Reimbursable', 'Paid Reimbursable', 'Early Reimbursement', 'Pending Reimbursement'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: INK_SOFT }}>reimbursement state →</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {states.map(s => {
          const t = byName(STATUSES, s);
          const active = s === current;
          return (
            <div key={s} style={{
              border: active ? `2px solid ${INK}` : `1.5px solid ${INK_SOFT}`,
              borderRadius: 999, padding: active ? 1 : 1.5, display: 'flex',
              opacity: active ? 1 : 0.7,
            }}>
              <Chip token={t} size={compact ? 'sm' : 'md'} label={t.short} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── V1: Mobile bottom sheet ───────────────────────────────────────────────
function DetailBottomSheet() {
  return (
    <PhoneFrame label="A · Bottom sheet (mobile, over list)" width={340} height={680}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: PAPER_2 }}>
        {/* dimmed list behind */}
        <div style={{ flex: 1, padding: '8px 12px', opacity: 0.45, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {SAMPLE_EXPENSES.slice(0, 3).map(e => (
            <div key={e.id} style={{ background: '#fff', border: `1px solid ${INK_SOFT}`, borderRadius: 6, padding: 8, fontSize: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{e.desc}</span><span>{fmtIDR(e.amount)}</span></div>
            </div>
          ))}
        </div>

        {/* Sheet */}
        <div style={{
          background: '#fff', borderTop: `2px solid ${INK}`,
          borderTopLeftRadius: 18, borderTopRightRadius: 18,
          padding: '8px 14px 12px',
          boxShadow: '0 -6px 0 ' + INK,
          maxHeight: '78%',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ width: 34, height: 4, background: INK, borderRadius: 999, alignSelf: 'center', margin: '2px 0 6px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 11, color: INK_SOFT }}>Mon, 11 May 2026</div>
            <div style={{ fontSize: 11, color: INK_SOFT }}>delete</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 28, fontWeight: 800 }}>{fmtIDR(78000)}</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: INK_SOFT }}>=26000*3</div>
          </div>
          <input defaultValue="Grab to office (team)" style={{ border: `1.5px solid ${INK}`, borderRadius: 6, padding: '7px 10px', fontSize: 13, fontFamily: 'inherit' }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ flex: 1, border: `1.5px solid ${INK}`, borderRadius: 6, padding: '6px 8px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Chip token={byName(CATEGORIES, 'Transportations')} size="sm" /><span style={{ color: INK_SOFT, fontSize: 10 }}>▾</span>
            </div>
            <div style={{ flex: 1, border: `1.5px solid ${INK}`, borderRadius: 6, padding: '6px 8px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Chip token={byName(METHODS, 'Gopay')} size="sm" /><span style={{ color: INK_SOFT, fontSize: 10 }}>▾</span>
            </div>
          </div>
          <ReimbStateMachine compact />
          <Btn primary style={{ marginTop: 4 }}>Save changes</Btn>
        </div>
      </div>
    </PhoneFrame>
  );
}

// ─── V2: Desktop slide-over panel ─────────────────────────────────────────
function DetailSlideOver() {
  return (
    <DesktopFrame label="B · Slide-over panel (desktop)" width={1180} height={720}>
      <div style={{ height: '100%', display: 'flex' }}>
        {/* Dimmed list */}
        <div style={{ flex: 1, padding: '16px 22px', opacity: 0.42, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Expenses · May</div>
          {SAMPLE_EXPENSES.slice(0, 7).map((e, i) => (
            <div key={e.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 100px 100px 130px 110px',
              padding: '7px 10px', fontSize: 12, gap: 8,
              borderBottom: `1px dashed ${INK_SOFT}`,
              background: i === 1 ? PAPER_2 : 'transparent', borderRadius: i === 1 ? 6 : 0,
            }}>
              <div>{e.desc}</div>
              <Chip token={byName(CATEGORIES, e.cat)} size="sm" />
              <Chip token={byName(METHODS, e.method)} size="sm" />
              <Chip token={byName(STATUSES, e.status)} size="sm" label={byName(STATUSES, e.status).short} />
              <div style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>{fmtIDR(e.amount)}</div>
            </div>
          ))}
        </div>

        {/* Panel */}
        <div style={{
          width: 420, borderLeft: `2px solid ${INK}`, background: '#fff',
          padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14,
          boxShadow: '-6px 0 0 ' + INK,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 11, color: INK_SOFT, fontFamily: 'JetBrains Mono, monospace' }}>EXP-2026-0511-02</div>
            <span style={{ fontSize: 13, color: INK_SOFT }}>✕</span>
          </div>
          <div>
            <div style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: INK_SOFT }}>amount</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 30, fontWeight: 800 }}>{fmtIDR(78000)}</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: INK_SOFT }}>=26000*3</div>
            </div>
          </div>
          <FieldStub label="description" value="Grab to office (team)" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: INK_SOFT, marginBottom: 3 }}>category</div>
              <div style={{ border: `1.5px solid ${INK}`, borderRadius: 6, padding: 7, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
                <Chip token={byName(CATEGORIES, 'Transportations')} size="md" /><span style={{ color: INK_SOFT }}>▾</span>
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: INK_SOFT, marginBottom: 3 }}>method</div>
              <div style={{ border: `1.5px solid ${INK}`, borderRadius: 6, padding: 7, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
                <Chip token={byName(METHODS, 'Gopay')} size="md" /><span style={{ color: INK_SOFT }}>▾</span>
              </div>
            </div>
            <FieldStub label="date" value="Mon, 11 May 2026" />
            <FieldStub label="recorded" value="11 May, 09:42" />
          </div>
          <ReimbStateMachine />
          <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
            <Btn style={{ flex: 1 }}>Delete</Btn>
            <Btn style={{ flex: 1 }}>Cancel</Btn>
            <Btn primary style={{ flex: 2 }}>Save</Btn>
          </div>
        </div>
      </div>
    </DesktopFrame>
  );
}

// ─── V3: Dedicated page with timeline ──────────────────────────────────────
function DetailPage() {
  const events = [
    { when: '11 May, 09:42', what: 'Recorded as Unpaid Reimbursable', who: 'you' },
    { when: '11 May, 14:08', what: 'Marked Pending — submitted to expense system', who: 'you' },
    { when: '— pending —', what: 'Awaiting Paid Reimbursable confirmation', dim: true },
  ];
  return (
    <DesktopFrame label="C · Full page (with state-machine timeline)" width={1180} height={720}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '16px 26px', gap: 14 }}>
        <div style={{ fontSize: 11, color: INK_SOFT, display: 'flex', gap: 4 }}>
          <span style={{ textDecoration: 'underline' }}>Expenses</span><span>›</span><span>May 2026</span><span>›</span><span style={{ fontWeight: 600, color: INK }}>Grab to office (team)</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, flex: 1, overflow: 'hidden' }}>
          {/* Main form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
              <div>
                <div style={{ fontFamily: 'Caveat, cursive', fontSize: 16, color: INK_SOFT }}>amount</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 42, fontWeight: 800, letterSpacing: -1 }}>{fmtIDR(78000)}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: INK_SOFT }}>raw =26000*3 · resolved 78000 IDR</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <Btn small>Duplicate</Btn>
                <Btn small>Delete</Btn>
                <Btn small primary>Save</Btn>
              </div>
            </div>
            <Scribble />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <FieldStub label="date" value="Mon, 11 May 2026" />
              <div>
                <div style={{ fontFamily: 'Caveat, cursive', fontSize: 15, color: INK_SOFT, marginBottom: 3 }}>category</div>
                <div style={{ border: `1.75px solid ${INK}`, borderRadius: 6, padding: 7, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
                  <Chip token={byName(CATEGORIES, 'Transportations')} size="md" /><span style={{ color: INK_SOFT }}>▾</span>
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'Caveat, cursive', fontSize: 15, color: INK_SOFT, marginBottom: 3 }}>method</div>
                <div style={{ border: `1.75px solid ${INK}`, borderRadius: 6, padding: 7, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
                  <Chip token={byName(METHODS, 'Gopay')} size="md" /><span style={{ color: INK_SOFT }}>▾</span>
                </div>
              </div>
            </div>
            <FieldStub label="description" value="Grab to office (team)" />
            <div>
              <ReimbStateMachine current="Pending Reimbursement" />
              <Anno style={{ marginTop: 6 }} arrow="up">illegal transitions are disabled, not hidden</Anno>
            </div>
          </div>
          {/* Timeline */}
          <div style={{ borderLeft: `1.5px dashed ${INK_SOFT}`, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>History</div>
            {events.map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, opacity: e.dim ? 0.55 : 1 }}>
                <div style={{ width: 10, height: 10, borderRadius: 999, border: `1.5px solid ${INK}`, background: e.dim ? PAPER_2 : INK, marginTop: 4, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 11, color: INK_SOFT, fontFamily: 'JetBrains Mono, monospace' }}>{e.when}</div>
                  <div style={{ fontSize: 12 }}>{e.what}</div>
                  {e.who && <div style={{ fontSize: 10, color: INK_SOFT, fontFamily: 'Caveat, cursive', fontSize: 13 }}>— {e.who}</div>}
                </div>
              </div>
            ))}
            <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: `1px dashed ${INK_SOFT}` }}>
              <div style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: INK_SOFT }}>contribution to net owed</div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 18, fontWeight: 700 }}>− {fmtIDR(78000)}</div>
              <div style={{ fontSize: 10, color: INK_SOFT }}>(Unpaid counts as money out)</div>
            </div>
          </div>
        </div>
      </div>
    </DesktopFrame>
  );
}

Object.assign(window, { DetailBottomSheet, DetailSlideOver, DetailPage });

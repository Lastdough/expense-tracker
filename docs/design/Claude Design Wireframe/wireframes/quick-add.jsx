// Quick-Add — the daily driver. 3 distinct interaction models.
// V1: Keypad-first  — big numeric keypad bottom, fields stack above, one screen
// V2: Stepper — one field per screen, swipe/tap to advance (progressive disclosure)
// V3: Single-screen dense grid — every field visible, chips for category/method, keyboard friendly

// ─── V1: Keypad-first ─────────────────────────────────────────────────────
function QuickAddKeypad() {
  const food = byName(CATEGORIES, 'Food');
  const gopay = byName(METHODS, 'Gopay');
  return (
    <PhoneFrame label="A · Keypad-first" width={340} height={680}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px 14px', borderBottom: `1.5px solid ${INK}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>＋ New expense</span>
          <span style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: INK_SOFT }}>Mon 11 May</span>
        </div>

        {/* Amount display */}
        <div style={{ padding: '20px 18px 8px', textAlign: 'center', borderBottom: `1.5px dashed ${INK_SOFT}` }}>
          <div style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: INK_SOFT }}>amount</div>
          <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1, fontFamily: 'JetBrains Mono, monospace' }}>
            =26000*3
          </div>
          <div style={{ fontSize: 13, color: INK_SOFT, marginTop: 2 }}>= {fmtIDR(78000)}</div>
        </div>

        {/* Mini-chips for last-used */}
        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 56, fontFamily: 'Caveat, cursive', color: INK_SOFT, fontSize: 14 }}>category</span>
            <Chip token={food} size="md" /><span style={{ color: INK_SOFT }}>·</span>
            <Chip token={byName(CATEGORIES, 'Transportations')} size="md" /><span style={{ color: INK_SOFT }}>·</span>
            <span style={{ fontSize: 11, color: INK_SOFT }}>more…</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 56, fontFamily: 'Caveat, cursive', color: INK_SOFT, fontSize: 14 }}>method</span>
            <Chip token={gopay} size="md" /><span style={{ color: INK_SOFT }}>·</span>
            <Chip token={byName(METHODS, 'BCA')} size="md" /><span style={{ color: INK_SOFT }}>·</span>
            <Chip token={byName(METHODS, 'Cash')} size="md" />
          </div>
          <input placeholder="description…" style={{
            border: `1.5px solid ${INK}`, borderRadius: 6, padding: '7px 10px',
            fontSize: 13, fontFamily: 'inherit', background: '#fff', outline: 'none',
          }} defaultValue="Grab to office (team)" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
            <Chip token={byName(STATUSES, 'Unpaid Reimbursable')} size="sm" />
            <span style={{ color: INK_SOFT }}>·</span>
            <Anno style={{ fontSize: 14 }}>tap to change</Anno>
          </div>
        </div>

        {/* Keypad */}
        <div style={{ flex: 1, padding: '0 12px 10px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {['7','8','9','÷','4','5','6','×','1','2','3','−','.','0','⌫','+'].map(k => (
              <div key={k} style={{
                border: `1.5px solid ${INK}`, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 600, background: '#fff',
              }}>{k}</div>
            ))}
          </div>
          <button style={{
            marginTop: 8, padding: '12px',
            border: `1.75px solid ${INK}`, background: INK, color: PAPER,
            borderRadius: 8, fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
          }}>Save  ⏎</button>
        </div>
      </div>
    </PhoneFrame>
  );
}

// ─── V2: Stepper / one field per screen ────────────────────────────────────
function QuickAddStepper() {
  // Showing the "category" step with previous chip-stub at top
  return (
    <PhoneFrame label="B · Stepper (swipe through fields)" width={340} height={680}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* progress dots */}
        <div style={{ padding: '12px 16px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: INK_SOFT, fontWeight: 600 }}>2 / 6</span>
          <div style={{ flex: 1, height: 4, background: PAPER_2, borderRadius: 999, border: `1px solid ${INK_SOFT}`, overflow: 'hidden' }}>
            <div style={{ width: '33%', height: '100%', background: INK }} />
          </div>
          <span style={{ fontSize: 11, color: INK_SOFT }}>skip ›</span>
        </div>

        {/* breadcrumb of completed fields */}
        <div style={{ padding: '4px 16px 8px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: INK_SOFT, borderBottom: `1px dashed ${INK_SOFT}` }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: INK }}>{fmtIDR(78000)}</span>
          <span>›</span><span style={{ fontFamily: 'Caveat, cursive', fontSize: 14 }}>now picking category</span>
        </div>

        {/* Step prompt */}
        <div style={{ padding: '20px 18px 12px' }}>
          <div style={{ fontFamily: 'Caveat, cursive', fontSize: 17, color: INK_SOFT }}>which category?</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.4, marginTop: 2 }}>Pick one</div>
        </div>

        {/* Big touch targets */}
        <div style={{ flex: 1, padding: '0 14px 10px', display: 'flex', flexDirection: 'column', gap: 7, overflow: 'auto' }}>
          {CATEGORIES.slice(0, 7).map((c, i) => (
            <div key={c.name} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px',
              border: `${i === 1 ? '2px' : '1.5px'} solid ${INK}`,
              borderRadius: 8, background: i === 1 ? PAPER_2 : '#fff',
            }}>
              <Chip token={c} size="md" label="" style={{ width: 22, height: 22, padding: 0, borderRadius: 6 }} />
              <span style={{ fontSize: 14, fontWeight: i === 1 ? 700 : 500, flex: 1 }}>{c.name}</span>
              {i === 1 && <Anno style={{ fontSize: 14 }}>← last used</Anno>}
            </div>
          ))}
        </div>

        {/* Bottom nav */}
        <div style={{ padding: '10px 14px', borderTop: `1.5px solid ${INK}`, display: 'flex', gap: 8 }}>
          <Btn style={{ flex: 1 }}>← Back</Btn>
          <Btn primary style={{ flex: 2 }}>Next →</Btn>
        </div>
      </div>
    </PhoneFrame>
  );
}

// ─── V3: Dense single-screen grid ─────────────────────────────────────────
function QuickAddDense() {
  const cats = ['Food', 'Transportations', 'Groceries', 'Bill', 'Healthcare', 'Misc'];
  const meths = ['Gopay', 'BCA', 'Cash', 'Mandiri', 'Jago', 'ShopeePay'];
  return (
    <PhoneFrame label="C · Dense grid (everything on one screen)" width={340} height={680}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px 14px', borderBottom: `1.5px solid ${INK}`, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>＋ New expense</span>
          <span style={{ fontSize: 12, color: INK_SOFT }}>Today · 11 May</span>
        </div>

        <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 9, overflow: 'auto' }}>
          {/* Amount with formula bar */}
          <div style={{
            border: `2px solid ${INK}`, borderRadius: 8, padding: '8px 11px',
            display: 'flex', alignItems: 'baseline', gap: 8, background: '#fff',
          }}>
            <span style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: INK_SOFT }}>Rp</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 22, fontWeight: 700, flex: 1 }}>78.000</span>
            <span style={{ fontSize: 10, color: INK_SOFT, fontFamily: 'JetBrains Mono, monospace' }}>=26000*3</span>
          </div>

          {/* Category chips */}
          <div>
            <div style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: INK_SOFT, marginBottom: 4 }}>category</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {cats.map((c, i) => (
                <div key={c} style={{
                  border: i === 1 ? `2px solid ${INK}` : `1.5px solid ${INK_SOFT}`,
                  borderRadius: 999, padding: 1, display: 'flex',
                }}>
                  <Chip token={byName(CATEGORIES, c)} size="sm" />
                </div>
              ))}
              <span style={{ alignSelf: 'center', fontSize: 11, color: INK_SOFT }}>+ add</span>
            </div>
          </div>

          {/* Method chips */}
          <div>
            <div style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: INK_SOFT, marginBottom: 4 }}>method</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {meths.map((m, i) => (
                <div key={m} style={{
                  border: i === 0 ? `2px solid ${INK}` : `1.5px solid ${INK_SOFT}`,
                  borderRadius: 999, padding: 1, display: 'flex',
                }}>
                  <Chip token={byName(METHODS, m)} size="sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Desc */}
          <div>
            <div style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: INK_SOFT, marginBottom: 4 }}>description</div>
            <input defaultValue="Grab to office (team)" style={{
              width: '100%', border: `1.5px solid ${INK}`, borderRadius: 6,
              padding: '7px 10px', fontSize: 13, fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box',
            }} />
          </div>

          {/* Reimbursement + date inline */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: INK_SOFT, marginBottom: 4 }}>status</div>
              <div style={{ border: `1.5px solid ${INK}`, borderRadius: 6, padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 4, background: '#fff', justifyContent: 'space-between' }}>
                <Chip token={byName(STATUSES, 'Non-Reimbursable')} size="sm" />
                <span style={{ fontSize: 10, color: INK_SOFT }}>▾</span>
              </div>
            </div>
            <div style={{ width: 110 }}>
              <div style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: INK_SOFT, marginBottom: 4 }}>date</div>
              <div style={{ border: `1.5px solid ${INK}`, borderRadius: 6, padding: '7px 10px', fontSize: 12, background: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                Today<span style={{ color: INK_SOFT }}>▾</span>
              </div>
            </div>
          </div>

          <Anno arrow="up" style={{ fontSize: 14 }}>Enter from description = save & refocus amount</Anno>
        </div>

        <div style={{ padding: '10px 12px', borderTop: `1.5px solid ${INK}`, display: 'flex', gap: 8 }}>
          <Btn style={{ flex: 1 }}>Cancel</Btn>
          <Btn primary style={{ flex: 2 }}>Save ⏎</Btn>
        </div>
      </div>
    </PhoneFrame>
  );
}

Object.assign(window, { QuickAddKeypad, QuickAddStepper, QuickAddDense });

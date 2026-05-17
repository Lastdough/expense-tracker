// Expenses list — desktop-first. 3 layout variations.
// V1: Table — compact, dense, sortable headers
// V2: Cards — spacious, primary info big
// V3: Grouped by date — sections with sub-totals

function FilterBar({ kind = 'top' }) {
  // kind: 'top' = horizontal bar; 'chips' = chips row; 'side' = vertical panel (returned separately)
  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
      padding: kind === 'top' ? '10px 14px' : 0,
      border: kind === 'top' ? `1.5px solid ${INK}` : 0,
      borderRadius: kind === 'top' ? 8 : 0,
      background: kind === 'top' ? '#fff' : 'transparent',
      fontSize: 12,
    }}>
      <span style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: INK_SOFT }}>filter</span>
      <span style={{
        border: `1.25px solid ${INK}`, borderRadius: 999, padding: '3px 10px',
      }}>1 May — 31 May ▾</span>
      <span style={{ border: `1.25px solid ${INK}`, borderRadius: 999, padding: '3px 10px' }}>all categories ▾</span>
      <span style={{ border: `1.25px solid ${INK}`, borderRadius: 999, padding: '3px 10px' }}>all methods ▾</span>
      <span style={{ border: `1.25px solid ${INK}`, borderRadius: 999, padding: '3px 10px' }}>all statuses ▾</span>
      <input placeholder="search description…" style={{
        flex: 1, minWidth: 140, border: `1.25px solid ${INK_SOFT}`, borderRadius: 999,
        padding: '4px 11px', fontSize: 12, fontFamily: 'inherit', outline: 'none',
      }} />
      <span style={{ fontSize: 11, color: INK_SOFT }}>148 of 312</span>
    </div>
  );
}

// ─── V1: Compact table ─────────────────────────────────────────────────────
function ExpensesTable() {
  const cols = ['Date', 'Description', 'Category', 'Method', 'Status', 'Amount'];
  return (
    <DesktopFrame label="A · Table (compact, sortable)" width={1180} height={720}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '16px 22px', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.4 }}>Expenses</div>
            <div style={{ fontFamily: 'Caveat, cursive', fontSize: 16, color: INK_SOFT }}>May 2026 · 148 entries · {fmtIDR(3247500)}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn small>Export CSV</Btn>
            <Btn small primary>＋ Record</Btn>
          </div>
        </div>
        <FilterBar kind="top" />

        {/* Table */}
        <div style={{ flex: 1, border: `1.5px solid ${INK}`, borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '92px 1fr 140px 110px 160px 130px',
            padding: '8px 14px', borderBottom: `1.5px solid ${INK}`, background: PAPER_2,
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4,
          }}>
            {cols.map(c => <div key={c} style={{ textAlign: c === 'Amount' ? 'right' : 'left' }}>{c} {c === 'Date' && '↓'}</div>)}
          </div>
          {SAMPLE_EXPENSES.map((e, i) => (
            <div key={e.id} style={{
              display: 'grid', gridTemplateColumns: '92px 1fr 140px 110px 160px 130px',
              padding: '8px 14px', borderBottom: `1px dashed ${INK_SOFT}`,
              alignItems: 'center', fontSize: 12.5, background: i % 2 ? '#fff' : '#fbf8f1',
            }}>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5 }}>{e.date.slice(5)}</div>
              <div>{e.desc} {e.raw && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: INK_SOFT }}>{e.raw}</span>}</div>
              <div><Chip token={byName(CATEGORIES, e.cat)} size="sm" /></div>
              <div><Chip token={byName(METHODS, e.method)} size="sm" /></div>
              <div><Chip token={byName(STATUSES, e.status)} size="sm" label={byName(STATUSES, e.status).short} /></div>
              <div style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{fmtIDR(e.amount)}</div>
            </div>
          ))}
        </div>
      </div>
    </DesktopFrame>
  );
}

// ─── V2: Spacious cards ───────────────────────────────────────────────────
function ExpensesCards() {
  return (
    <DesktopFrame label="B · Cards (spacious, w/ side filters)" width={1180} height={720}>
      <div style={{ height: '100%', display: 'flex' }}>
        {/* Side filter panel */}
        <div style={{ width: 240, borderRight: `1.5px solid ${INK}`, padding: 18, background: PAPER_2, display: 'flex', flexDirection: 'column', gap: 14, fontSize: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Filters</div>
          <div>
            <div style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: INK_SOFT, marginBottom: 4 }}>date range</div>
            <FieldStub value="1 May — 31 May" />
          </div>
          <div>
            <div style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: INK_SOFT, marginBottom: 4 }}>category</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {CATEGORIES.slice(0, 6).map(c => (
                <label key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 12, height: 12, border: `1.5px solid ${INK}`, borderRadius: 3, display: 'inline-block' }} />
                  <Chip token={c} size="sm" />
                </label>
              ))}
              <span style={{ fontSize: 11, color: INK_SOFT, marginLeft: 19 }}>+ 4 more</span>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: INK_SOFT, marginBottom: 4 }}>status</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {STATUSES.map(s => <Chip key={s.name} token={s} size="sm" />)}
            </div>
          </div>
        </div>

        {/* Cards list */}
        <div style={{ flex: 1, padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.4 }}>Expenses · May</div>
            <div style={{ fontSize: 12, color: INK_SOFT }}>showing 9 / 148</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {SAMPLE_EXPENSES.slice(0, 6).map(e => (
              <div key={e.id} style={{
                border: `1.5px solid ${INK}`, borderRadius: 8, padding: '11px 13px',
                background: '#fff', display: 'flex', flexDirection: 'column', gap: 7,
                boxShadow: '2px 2px 0 ' + INK,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontSize: 11, color: INK_SOFT, fontFamily: 'JetBrains Mono, monospace' }}>{e.date}</div>
                  <div style={{ fontSize: 19, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{fmtIDR(e.amount)}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{e.desc}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  <Chip token={byName(CATEGORIES, e.cat)} size="sm" />
                  <Chip token={byName(METHODS, e.method)} size="sm" />
                  <Chip token={byName(STATUSES, e.status)} size="sm" label={byName(STATUSES, e.status).short} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DesktopFrame>
  );
}

// ─── V3: Grouped by date with sub-totals ──────────────────────────────────
function ExpensesGrouped() {
  const groups = {};
  SAMPLE_EXPENSES.forEach(e => { (groups[e.date] = groups[e.date] || []).push(e); });
  const orderedDates = Object.keys(groups).sort().reverse();
  return (
    <DesktopFrame label="C · Grouped by day (chip-filters across top)" width={1180} height={720}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '16px 26px', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.4 }}>Expenses · timeline</div>
            <div style={{ fontFamily: 'Caveat, cursive', fontSize: 15, color: INK_SOFT }}>swipe-to-reimburse on rows →</div>
          </div>
          <Btn small primary>＋ Record</Btn>
        </div>
        {/* Active filter chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: INK_SOFT }}>filtering by</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: `1.5px solid ${INK}`, borderRadius: 999, padding: '3px 10px', fontSize: 12, background: '#fff' }}>
            May 2026 <span style={{ color: INK_SOFT }}>✕</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: `1.5px solid ${INK}`, borderRadius: 999, padding: '3px 8px', fontSize: 12, background: '#fff' }}>
            <Chip token={byName(CATEGORIES, 'Food')} size="sm" /><span style={{ color: INK_SOFT }}>✕</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, border: `1.5px solid ${INK}`, borderRadius: 999, padding: '3px 8px', fontSize: 12, background: '#fff' }}>
            <Chip token={byName(STATUSES, 'Unpaid Reimbursable')} size="sm" /><span style={{ color: INK_SOFT }}>✕</span>
          </span>
          <span style={{ fontSize: 11, color: INK_SOFT, marginLeft: 4 }}>+ add filter</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: INK_SOFT }}>clear all</span>
        </div>

        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {orderedDates.slice(0, 3).map(date => {
            const list = groups[date];
            const subtotal = list.reduce((s, e) => s + e.amount, 0);
            return (
              <div key={date}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6, paddingBottom: 4, borderBottom: `1.5px solid ${INK}` }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{new Date(date + 'T00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}</div>
                  <div style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>{fmtIDR(subtotal)}</div>
                  <div style={{ fontSize: 11, color: INK_SOFT }}>{list.length} entries</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {list.map((e, i) => (
                    <div key={e.id} style={{
                      display: 'grid', gridTemplateColumns: '1fr 130px 110px 140px 120px',
                      alignItems: 'center', gap: 10, padding: '7px 4px',
                      borderBottom: i === list.length - 1 ? 'none' : `1px dotted ${INK_SOFT}`,
                      fontSize: 13,
                    }}>
                      <div>{e.desc}</div>
                      <div><Chip token={byName(CATEGORIES, e.cat)} size="sm" /></div>
                      <div><Chip token={byName(METHODS, e.method)} size="sm" /></div>
                      <div><Chip token={byName(STATUSES, e.status)} size="sm" label={byName(STATUSES, e.status).short} /></div>
                      <div style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{fmtIDR(e.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DesktopFrame>
  );
}

Object.assign(window, { ExpensesTable, ExpensesCards, ExpensesGrouped });

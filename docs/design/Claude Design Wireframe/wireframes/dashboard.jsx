// Dashboard — this-month overview.
// V1: Hero total + category bars + recent peek + net-owed callout (vertical primary)
// V2: 4-quadrant grid (parallel-importance modules)
// V3: Vertical scroll feed (mobile-feels-on-desktop reading order)

const CAT_BREAKDOWN = [
  { cat: 'Food',            amount: 642000 },
  { cat: 'Transportations', amount: 538000 },
  { cat: 'Bill',            amount: 412000 },
  { cat: 'Groceries',       amount: 387500 },
  { cat: 'Services',        amount: 305000 },
  { cat: 'Shopping',        amount: 264000 },
  { cat: 'Healthcare',      amount: 198000 },
  { cat: 'Supplies',        amount: 192500 },
  { cat: 'Entertainment',   amount: 152000 },
  { cat: 'Misc',            amount:  88500 },
];
const MONTH_TOTAL = CAT_BREAKDOWN.reduce((s, x) => s + x.amount, 0);
const BUDGET = 5000000;

function CategoryBars({ small, max = 10 }) {
  const top = CAT_BREAKDOWN.slice(0, max);
  const biggest = top[0].amount;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: small ? 5 : 7 }}>
      {top.map(x => {
        const tok = byName(CATEGORIES, x.cat);
        const pct = (x.amount / biggest) * 100;
        return (
          <div key={x.cat} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px', gap: 10, alignItems: 'center', fontSize: small ? 11 : 12 }}>
            <div><Chip token={tok} size="sm" /></div>
            <div style={{ height: small ? 12 : 16, border: `1.25px solid ${INK}`, background: '#fff', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
              <div style={{ width: pct + '%', height: '100%', background: tok.bg, borderRight: `1.25px solid ${INK}` }} />
            </div>
            <div style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{fmtIDR(x.amount)}</div>
          </div>
        );
      })}
    </div>
  );
}

function RecentPeek({ n = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {SAMPLE_EXPENSES.slice(0, n).map((e, i) => (
        <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: i === n - 1 ? 'none' : `1px dotted ${INK_SOFT}`, fontSize: 12 }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: INK_SOFT }}>{e.date.slice(5)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <Chip token={byName(CATEGORIES, e.cat)} size="sm" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.desc}</span>
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{fmtIDRshort(e.amount)}</div>
        </div>
      ))}
    </div>
  );
}

// ─── V1: Hero ─────────────────────────────────────────────────────────────
function DashboardHero() {
  return (
    <DesktopFrame label="A · Hero total · categories · recent · net-owed" width={1180} height={720}>
      <div style={{ height: '100%', padding: '18px 26px', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'Caveat, cursive', fontSize: 18, color: INK_SOFT }}>May 2026 · day 11 of 31</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>This month so far</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn small>Last month</Btn>
            <Btn small primary>＋ Record</Btn>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
          {/* Big total */}
          <div style={{ border: `2px solid ${INK}`, borderRadius: 10, padding: 22, background: '#fff', boxShadow: '3px 3px 0 ' + INK }}>
            <div style={{ fontFamily: 'Caveat, cursive', fontSize: 16, color: INK_SOFT }}>spent so far</div>
            <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1, fontFamily: 'JetBrains Mono, monospace' }}>{fmtIDR(MONTH_TOTAL)}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6, fontSize: 12, color: INK_SOFT }}>
              <span>of {fmtIDR(BUDGET)} budget</span>
              <span>·</span>
              <span style={{ color: INK, fontWeight: 600 }}>{fmtIDR(BUDGET - MONTH_TOTAL + 487500)} available</span>
            </div>
            <div style={{ marginTop: 10, height: 14, border: `1.5px solid ${INK}`, borderRadius: 3, background: '#fff', position: 'relative', overflow: 'hidden' }}>
              <div style={{ width: (MONTH_TOTAL / BUDGET * 100) + '%', height: '100%', background: INK }} />
              <div style={{ position: 'absolute', top: -2, left: '36%', bottom: -2, borderLeft: `1.5px dashed ${ACCENT}` }} />
              <div style={{ position: 'absolute', top: -22, left: '36%', fontFamily: 'Caveat, cursive', fontSize: 13, color: ACCENT }}>day 11 pace</div>
            </div>
          </div>
          {/* Net owed callout */}
          <div style={{ border: `2px solid ${INK}`, borderRadius: 10, padding: 22, background: PAPER_2 }}>
            <div style={{ fontFamily: 'Caveat, cursive', fontSize: 16, color: INK_SOFT }}>net owed to you</div>
            <div style={{ fontSize: 42, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', letterSpacing: -1 }}>{fmtIDR(487500)}</div>
            <div style={{ fontSize: 12, color: INK_SOFT, marginTop: 4 }}>= Σ|Early {fmtIDR(680000)}| − ΣUnpaid {fmtIDR(192500)}</div>
            <Scribble style={{ margin: '12px 0 10px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><Chip token={byName(STATUSES, 'Unpaid Reimbursable')} size="sm" /><span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{fmtIDR(192500)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><Chip token={byName(STATUSES, 'Early Reimbursement')} size="sm" /><span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{fmtIDR(680000)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><Chip token={byName(STATUSES, 'Pending Reimbursement')} size="sm" /><span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{fmtIDR(192500)}</span></div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
          <Box style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>By category</div>
              <div style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: INK_SOFT }}>10 active</div>
            </div>
            <CategoryBars />
          </Box>
          <Box style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Recent</div>
              <span style={{ fontSize: 11, color: INK_SOFT, cursor: 'pointer' }}>all expenses →</span>
            </div>
            <RecentPeek n={6} />
          </Box>
        </div>
      </div>
    </DesktopFrame>
  );
}

// ─── V2: 4-quadrant grid ──────────────────────────────────────────────────
function DashboardGrid() {
  return (
    <DesktopFrame label="B · 4-quadrant (parallel modules)" width={1180} height={720}>
      <div style={{ height: '100%', padding: '18px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.4 }}>Dashboard · May 2026</div>
          <div style={{ fontFamily: 'Caveat, cursive', fontSize: 15, color: INK_SOFT }}>tiles resize, drag to reorder later</div>
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 14, overflow: 'hidden' }}>
          {/* Total tile */}
          <Box style={{ padding: 16, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 11, color: INK_SOFT, textTransform: 'uppercase', letterSpacing: 0.4 }}>Spent</div>
            <div style={{ fontSize: 38, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.05, letterSpacing: -1 }}>{fmtIDR(MONTH_TOTAL)}</div>
            <div style={{ fontSize: 11, color: INK_SOFT, marginTop: 2 }}>of {fmtIDR(BUDGET)} · {Math.round(MONTH_TOTAL / BUDGET * 100)}%</div>
            <div style={{ flex: 1 }} />
            {/* sparkline-ish bars */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 56, borderBottom: `1.5px solid ${INK}` }}>
              {[20, 38, 15, 50, 28, 42, 60, 35, 25, 70, 45].map((h, i) => (
                <div key={i} style={{ flex: 1, height: h + '%', background: i === 10 ? INK : INK_SOFT, border: `1px solid ${INK}` }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: INK_SOFT, fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
              <span>1</span><span>5</span><span>11</span>
            </div>
          </Box>

          {/* Net owed tile */}
          <Box style={{ padding: 16, background: PAPER_2 }}>
            <div style={{ fontSize: 11, color: INK_SOFT, textTransform: 'uppercase', letterSpacing: 0.4 }}>Net owed to you</div>
            <div style={{ fontSize: 38, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.05, letterSpacing: -1 }}>{fmtIDR(487500)}</div>
            <div style={{ fontSize: 11, color: INK_SOFT }}>across 3 entries</div>
            <Scribble style={{ margin: '12px 0' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Chip token={byName(STATUSES, 'Early Reimbursement')} size="sm" />
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>+ {fmtIDR(680000)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Chip token={byName(STATUSES, 'Unpaid Reimbursable')} size="sm" />
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>− {fmtIDR(192500)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Chip token={byName(STATUSES, 'Pending Reimbursement')} size="sm" />
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: INK_SOFT }}>{fmtIDR(192500)} pending</span>
              </div>
            </div>
          </Box>

          {/* Categories tile */}
          <Box style={{ padding: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 11, color: INK_SOFT, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>By category</div>
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <CategoryBars small max={7} />
            </div>
          </Box>

          {/* Recent tile */}
          <Box style={{ padding: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 11, color: INK_SOFT, textTransform: 'uppercase', letterSpacing: 0.4 }}>Recent</div>
              <div style={{ fontSize: 11, color: INK_SOFT }}>last 5</div>
            </div>
            <div style={{ marginTop: 6, flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <RecentPeek n={5} />
            </div>
          </Box>
        </div>
      </div>
    </DesktopFrame>
  );
}

// ─── V3: Vertical scroll feed ─────────────────────────────────────────────
function DashboardFeed() {
  return (
    <DesktopFrame label="C · Scroll feed (narrative reading order)" width={1180} height={720}>
      <div style={{ height: '100%', display: 'flex', justifyContent: 'center', overflow: 'auto' }}>
        <div style={{ width: 640, padding: '24px 0 40px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div>
            <div style={{ fontFamily: 'Caveat, cursive', fontSize: 18, color: INK_SOFT }}>Monday, 11 May 2026</div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.6, lineHeight: 1.1 }}>You've spent {fmtIDR(MONTH_TOTAL)} in May.</div>
            <div style={{ fontSize: 14, color: INK_SOFT, marginTop: 4 }}>
              That's {Math.round(MONTH_TOTAL / BUDGET * 100)}% of your monthly budget, on day 11 of 31. Roughly on pace.
            </div>
          </div>

          <Scribble />

          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Where it went</div>
            <CategoryBars max={6} />
            <div style={{ fontSize: 11, color: INK_SOFT, marginTop: 6 }}>+ 4 more categories below the fold</div>
          </div>

          <Scribble />

          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>People owe you {fmtIDR(487500)}</div>
            <div style={{ fontSize: 13, color: INK_SOFT, marginBottom: 8 }}>
              You've fronted {fmtIDR(192500)} in unpaid reimbursables, and received {fmtIDR(680000)} early.
              Net <b style={{ color: INK }}>+{fmtIDR(487500)}</b>.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn small>Open receipt</Btn>
              <Btn small>See reimbursables</Btn>
            </div>
          </div>

          <Scribble />

          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Recent entries</div>
            <RecentPeek n={6} />
          </div>
        </div>
      </div>
    </DesktopFrame>
  );
}

Object.assign(window, { DashboardHero, DashboardGrid, DashboardFeed });

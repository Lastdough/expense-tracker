// Shell & navigation variations.
// V1: Mobile bottom tabs (the daily-driver layout)
// V2: Desktop side rail (collapsible, dense)
// V3: Desktop top tabs (broad surface, secondary actions on right)

// ─── V1: Mobile bottom tabs ───────────────────────────────────────────────
function ShellMobileTabs() {
  const tabs = [
    { name: 'Quick Add', icon: '＋', active: true },
    { name: 'Expenses', icon: '☰' },
    { name: 'Dashboard', icon: '◐' },
    { name: 'Receipt', icon: '▢' },
    { name: 'Settings', icon: '⚙' },
  ];
  return (
    <PhoneFrame label="A · Bottom tabs (mobile)" width={340} height={680}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <div style={{
          padding: '10px 16px 8px', borderBottom: `1.5px solid ${INK}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: INK_SOFT, lineHeight: 1 }}>Monday</div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>Quick Add</div>
          </div>
          <div style={{
            border: `1.5px solid ${INK}`, borderRadius: 999,
            padding: '4px 10px', fontSize: 11, fontWeight: 600,
          }}>May ▾</div>
        </div>

        {/* Body placeholder */}
        <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Box dashed style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK_SOFT }}>
            <Anno>screen content area</Anno>
          </Box>
          <Anno style={{ marginTop: 4 }} arrow="down">5 destinations, primary = leftmost</Anno>
        </div>

        {/* Bottom tab bar */}
        <div style={{
          borderTop: `1.5px solid ${INK}`,
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
          background: PAPER_2,
        }}>
          {tabs.map(t => (
            <div key={t.name} style={{
              padding: '8px 4px 12px', textAlign: 'center',
              borderTop: t.active ? `3px solid ${INK}` : '3px solid transparent',
              marginTop: -1,
            }}>
              <div style={{ fontSize: 18, lineHeight: 1, fontWeight: t.active ? 900 : 500 }}>{t.icon}</div>
              <div style={{ fontSize: 9.5, fontWeight: t.active ? 700 : 500, marginTop: 4, letterSpacing: 0.2 }}>{t.name}</div>
            </div>
          ))}
        </div>
      </div>
    </PhoneFrame>
  );
}

// ─── V2: Desktop side rail ─────────────────────────────────────────────────
function ShellSideRail() {
  const items = [
    { name: 'Quick Add', glyph: '＋', kbd: 'A' },
    { name: 'Expenses', glyph: '≡', kbd: 'E', active: true },
    { name: 'Dashboard', glyph: '◐', kbd: 'D' },
    { name: 'Receipt export', glyph: '▢', kbd: 'R' },
    { name: 'Settings', glyph: '⚙', kbd: ',' },
  ];
  return (
    <DesktopFrame label="B · Side rail (desktop)" width={1180} height={720}>
      <div style={{ height: '100%', display: 'flex' }}>
        {/* Rail */}
        <div style={{
          width: 220, borderRight: `1.5px solid ${INK}`,
          padding: '18px 14px', background: PAPER_2,
          display: 'flex', flexDirection: 'column', gap: 18,
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: -0.3 }}>Ledger</div>
            <div style={{ fontSize: 10.5, color: INK_SOFT, marginTop: 1 }}>personal · IDR</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {items.map(i => (
              <div key={i.name} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 10px', borderRadius: 6,
                background: i.active ? INK : 'transparent',
                color: i.active ? PAPER : INK,
                fontSize: 13, fontWeight: i.active ? 600 : 500,
              }}>
                <span style={{ width: 18, textAlign: 'center', fontSize: 13 }}>{i.glyph}</span>
                <span style={{ flex: 1 }}>{i.name}</span>
                <span style={{
                  fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
                  border: `1px solid ${i.active ? PAPER : INK_SOFT}`,
                  padding: '0 4px', borderRadius: 3, opacity: 0.7,
                }}>⌘{i.kbd}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 'auto', borderTop: `1px dashed ${INK_SOFT}`, paddingTop: 12 }}>
            <NetOwedMini amount={487500} />
          </div>
        </div>
        {/* Main */}
        <div style={{ flex: 1, padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'Caveat, cursive', fontSize: 18, color: INK_SOFT }}>148 entries · May 2026</div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>Expenses</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn small>Import CSV</Btn>
              <Btn small primary>＋ Record</Btn>
            </div>
          </div>
          <Box dashed style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK_SOFT }}>
            <Anno>main view — list / dashboard / settings render here</Anno>
          </Box>
        </div>
      </div>
    </DesktopFrame>
  );
}

// ─── V3: Desktop top tabs ─────────────────────────────────────────────────
function ShellTopTabs() {
  const tabs = ['Quick Add', 'Expenses', 'Dashboard', 'Receipt', 'Settings'];
  const active = 'Dashboard';
  return (
    <DesktopFrame label="C · Top tabs (desktop)" width={1180} height={720}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <div style={{
          padding: '12px 22px', borderBottom: `1.5px solid ${INK}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: -0.3 }}>Ledger</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {tabs.map(t => (
                <div key={t} style={{
                  padding: '7px 14px', borderRadius: 6,
                  fontSize: 13, fontWeight: t === active ? 700 : 500,
                  background: t === active ? INK : 'transparent',
                  color: t === active ? PAPER : INK,
                }}>{t}</div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              border: `1.5px solid ${INK}`, borderRadius: 999,
              padding: '5px 14px', fontSize: 12, display: 'flex', gap: 6, alignItems: 'center',
            }}>
              <span style={{ fontFamily: 'Caveat, cursive', color: INK_SOFT }}>search</span>
              <span style={{
                fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
                border: `1px solid ${INK_SOFT}`, padding: '0 4px', borderRadius: 3,
              }}>⌘K</span>
            </div>
            <Btn small primary>＋ Record</Btn>
          </div>
        </div>
        {/* Body */}
        <div style={{ flex: 1, padding: '20px 26px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>May 2026</div>
            <div style={{ fontFamily: 'Caveat, cursive', fontSize: 18, color: INK_SOFT }}>day 11 of 31</div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'baseline' }}>
              <div><span style={{ fontSize: 11, color: INK_SOFT }}>Spent  </span><span style={{ fontWeight: 700 }}>{fmtIDR(3247500)}</span></div>
              <div><span style={{ fontSize: 11, color: INK_SOFT }}>Net owed  </span><span style={{ fontWeight: 700 }}>{fmtIDR(487500)}</span></div>
              <div><span style={{ fontSize: 11, color: INK_SOFT }}>Available  </span><span style={{ fontWeight: 700 }}>{fmtIDR(1752500)}</span></div>
            </div>
          </div>
          <Box dashed style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: INK_SOFT }}>
            <Anno>tab content area</Anno>
          </Box>
        </div>
      </div>
    </DesktopFrame>
  );
}

Object.assign(window, { ShellMobileTabs, ShellSideRail, ShellTopTabs });

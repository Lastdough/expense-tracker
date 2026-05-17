// Settings page — 3 tabs (Categories / Methods / Statuses).
// All three aggregates share the same schema, so layout variants apply to all.
// V1: Standard table list w/ inline color preview
// V2: Color-emphasized card grid (visual swatches first)
// V3: Inline-edit list w/ drag handles (every row editable in place)

function TabsHeader({ active }) {
  const tabs = [
    { name: 'Categories', count: 10 },
    { name: 'Methods', count: 6 },
    { name: 'Reimbursement statuses', count: 5 },
  ];
  return (
    <div style={{ display: 'flex', borderBottom: `1.5px solid ${INK}`, gap: 0 }}>
      {tabs.map(t => (
        <div key={t.name} style={{
          padding: '10px 18px',
          borderBottom: t.name === active ? `3px solid ${INK}` : 'none',
          marginBottom: -1.5,
          fontWeight: t.name === active ? 700 : 500,
          fontSize: 13,
          color: t.name === active ? INK : INK_SOFT,
          display: 'flex', gap: 7, alignItems: 'center',
        }}>
          {t.name}
          <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', background: PAPER_2, padding: '1px 6px', borderRadius: 999, border: `1px solid ${INK_SOFT}` }}>{t.count}</span>
        </div>
      ))}
    </div>
  );
}

// ─── V1: Table list ───────────────────────────────────────────────────────
function SettingsTable() {
  return (
    <DesktopFrame label="A · Tabbed page · table list" width={1180} height={720}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 22px 8px' }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.4 }}>Settings · Reference data</div>
          <div style={{ fontFamily: 'Caveat, cursive', fontSize: 15, color: INK_SOFT }}>archive, not delete — these reference historical expenses</div>
        </div>
        <TabsHeader active="Categories" />
        <div style={{ padding: '14px 22px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Btn small primary>＋ Add category</Btn>
            <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, border: `1.5px solid ${INK}`, borderRadius: 3 }} /> show archived
            </label>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: INK_SOFT }}>drag rows to reorder · displayOrder is 1-indexed</span>
          </div>
          <div style={{ flex: 1, border: `1.5px solid ${INK}`, borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '38px 1.5fr 100px 100px 1fr 100px 90px', padding: '8px 12px', borderBottom: `1.5px solid ${INK}`, background: PAPER_2, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              <div></div><div>Name</div><div>BG</div><div>FG</div><div>Preview</div><div>Order</div><div></div>
            </div>
            {CATEGORIES.map((c, i) => (
              <div key={c.name} style={{ display: 'grid', gridTemplateColumns: '38px 1.5fr 100px 100px 1fr 100px 90px', padding: '7px 12px', borderBottom: `1px dashed ${INK_SOFT}`, alignItems: 'center', fontSize: 12.5, background: i % 2 ? '#fff' : '#fbf8f1' }}>
                <div style={{ cursor: 'grab', color: INK_SOFT, fontSize: 14 }}>⋮⋮</div>
                <div style={{ fontWeight: 500 }}>{c.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 14, height: 14, borderRadius: 3, background: c.bg, border: `1px solid ${INK_SOFT}` }} />
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>{c.bg}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 14, height: 14, borderRadius: 3, background: c.fg, border: `1px solid ${INK_SOFT}` }} />
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>{c.fg}</span>
                </div>
                <div><Chip token={c} size="sm" /></div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{i + 1}</div>
                <div style={{ display: 'flex', gap: 6, fontSize: 11, color: INK_SOFT }}>
                  <span>edit</span><span>·</span><span>archive</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DesktopFrame>
  );
}

// ─── V2: Color-emphasized card grid ───────────────────────────────────────
function SettingsCards() {
  return (
    <DesktopFrame label="B · Tabbed page · swatch grid" width={1180} height={720}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 22px 8px' }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.4 }}>Settings · Methods</div>
          <div style={{ fontFamily: 'Caveat, cursive', fontSize: 15, color: INK_SOFT }}>colors are the point — show them big</div>
        </div>
        <TabsHeader active="Methods" />
        <div style={{ padding: '16px 22px', flex: 1, overflow: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {METHODS.map((m, i) => (
              <div key={m.name} style={{ border: `1.75px solid ${INK}`, borderRadius: 10, overflow: 'hidden', background: '#fff', boxShadow: '2.5px 2.5px 0 ' + INK }}>
                <div style={{ background: m.bg, color: m.fg, padding: '22px 16px', fontWeight: 700, fontSize: 17, position: 'relative' }}>
                  {m.name}
                  <div style={{ position: 'absolute', top: 6, right: 8, fontSize: 10, opacity: 0.7, fontFamily: 'JetBrains Mono, monospace' }}>{i + 1}</div>
                </div>
                <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: INK_SOFT }}>
                    <span>background</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', color: INK }}>{m.bg}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: INK_SOFT }}>
                    <span>foreground</span>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', color: INK }}>{m.fg}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, fontSize: 11 }}>
                    <span style={{ border: `1.25px solid ${INK_SOFT}`, borderRadius: 4, padding: '2px 7px', cursor: 'pointer' }}>rename</span>
                    <span style={{ border: `1.25px solid ${INK_SOFT}`, borderRadius: 4, padding: '2px 7px', cursor: 'pointer' }}>recolor</span>
                    <span style={{ marginLeft: 'auto', color: INK_SOFT, cursor: 'pointer' }}>archive</span>
                  </div>
                </div>
              </div>
            ))}
            <div style={{ border: `1.5px dashed ${INK}`, borderRadius: 10, padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 142, color: INK_SOFT }}>
              ＋ Add method
            </div>
          </div>
        </div>
      </div>
    </DesktopFrame>
  );
}

// ─── V3: Inline edit list w/ drag handles ─────────────────────────────────
function SettingsInline() {
  return (
    <DesktopFrame label="C · Tabbed page · inline edit (everything tweakable in place)" width={1180} height={720}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 22px 8px' }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.4 }}>Settings · Reimbursement statuses</div>
          <div style={{ fontFamily: 'Caveat, cursive', fontSize: 15, color: INK_SOFT }}>click any field to edit · changes save on blur</div>
        </div>
        <TabsHeader active="Reimbursement statuses" />
        <div style={{ padding: '14px 22px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {STATUSES.map((s, i) => (
            <div key={s.name} style={{
              border: `1.5px solid ${INK}`, borderRadius: 8, padding: '10px 14px',
              display: 'grid', gridTemplateColumns: '28px 1.5fr 1fr 1fr 130px 90px',
              alignItems: 'center', gap: 14, background: '#fff',
            }}>
              <div style={{ cursor: 'grab', color: INK_SOFT, fontSize: 16, lineHeight: 1 }}>⋮⋮</div>
              <div>
                <div style={{ fontSize: 10, color: INK_SOFT, fontFamily: 'Caveat, cursive', fontSize: 13 }}>name</div>
                <input defaultValue={s.name} style={{ border: 'none', borderBottom: `1.25px dashed ${INK_SOFT}`, padding: '2px 0', fontSize: 14, fontFamily: 'inherit', fontWeight: 500, width: '100%', outline: 'none', background: 'transparent' }} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: INK_SOFT, fontFamily: 'Caveat, cursive', fontSize: 13 }}>background</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 18, height: 18, borderRadius: 4, background: s.bg, border: `1.25px solid ${INK_SOFT}`, cursor: 'pointer' }} />
                  <input defaultValue={s.bg} style={{ border: 'none', borderBottom: `1.25px dashed ${INK_SOFT}`, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', padding: '2px 0', width: 80, background: 'transparent', outline: 'none' }} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: INK_SOFT, fontFamily: 'Caveat, cursive', fontSize: 13 }}>foreground</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 18, height: 18, borderRadius: 4, background: s.fg, border: `1.25px solid ${INK_SOFT}`, cursor: 'pointer' }} />
                  <input defaultValue={s.fg} style={{ border: 'none', borderBottom: `1.25px dashed ${INK_SOFT}`, fontSize: 12, fontFamily: 'JetBrains Mono, monospace', padding: '2px 0', width: 80, background: 'transparent', outline: 'none' }} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: INK_SOFT, fontFamily: 'Caveat, cursive', fontSize: 13 }}>preview</div>
                <Chip token={s} size="md" />
              </div>
              <div style={{ fontSize: 11, color: INK_SOFT, display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <span style={{ cursor: 'pointer' }}>archive</span>
              </div>
            </div>
          ))}
          <div style={{ border: `1.5px dashed ${INK}`, borderRadius: 8, padding: '10px 14px', color: INK_SOFT, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            ＋ Add status… <Anno style={{ marginLeft: 'auto' }}>archive transitions emit a domain event</Anno>
          </div>
        </div>
      </div>
    </DesktopFrame>
  );
}

Object.assign(window, { SettingsTable, SettingsCards, SettingsInline });

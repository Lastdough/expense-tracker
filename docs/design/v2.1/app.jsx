// ─────────────────────────────────────────────────────────────────────────
// Claude Design v2.1 — page layout
// Stages the DatePicker in each context where it replaces native <input type="date">.
// Sections (top → bottom):
//   1. Header + lead
//   2. Hero — single-date picker open, with anatomy callouts
//   3. Triggers in context — closed-state strip, one per usage site
//   4. Range with presets — Receipt builder context
//   5. Range, no presets — Expenses filter context
//   6. Mobile bottom sheet — single + range
//   7. Transition modal — Mark as Paid → on what date?
//   8. Keyboard map + state legend
// ─────────────────────────────────────────────────────────────────────────

const { useState: useStateA, useEffect: useEffectA, useRef: useRefA } = React;

// Use the same TWEAKABLE state for picker config. Tweaks panel exposes:
//   weekStart, todayIndicator, presetPlacement, twoMonthRange, showJumps, emphasizeWeekends
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "weekStart": 0,
  "todayIndicator": "ring",
  "presetPlacement": "sidebar",
  "twoMonthRange": false,
  "showJumps": true,
  "emphasizeWeekends": false
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Demo state — shared so toggling tweaks doesn't reset selections
  const today = window.__TODAY__;
  const [singleQA, setSingleQA] = useStateA(today);
  const [singleDetail, setSingleDetail] = useStateA(today);
  const [singlePaid, setSinglePaid] = useStateA(today);
  const [filterRange, setFilterRange] = useStateA({ start: window.addDays(today, -6), end: today });
  const [receiptRange, setReceiptRange] = useStateA({ start: new Date(2026,4,1), end: today });

  const cfg = {
    weekStart: t.weekStart,
    todayIndicator: t.todayIndicator,
    showJumps: t.showJumps,
    emphasizeWeekends: t.emphasizeWeekends,
  };

  return (
    <div className="min-h-screen w-full">
      <TweaksPanel>
        <TweakSection label="Layout">
          <TweakRadio label="Week starts" value={t.weekStart} onChange={(v) => setTweak('weekStart', v)}
            options={[{label: 'Sun', value: 0}, {label: 'Mon', value: 1}]} />
          <TweakRadio label="Today indicator" value={t.todayIndicator} onChange={(v) => setTweak('todayIndicator', v)}
            options={[{label: 'Ring', value: 'ring'}, {label: 'Dot', value: 'label'}]} />
          <TweakToggle label="Quick-jump chips" value={t.showJumps} onChange={(v) => setTweak('showJumps', v)} />
          <TweakToggle label="Dim weekends" value={t.emphasizeWeekends} onChange={(v) => setTweak('emphasizeWeekends', v)} />
        </TweakSection>
        <TweakSection label="Range picker">
          <TweakRadio label="Presets" value={t.presetPlacement} onChange={(v) => setTweak('presetPlacement', v)}
            options={[{label: 'Sidebar', value: 'sidebar'}, {label: 'Top', value: 'topbar'}]} />
          <TweakToggle label="Two-month range" value={t.twoMonthRange} onChange={(v) => setTweak('twoMonthRange', v)} />
        </TweakSection>
      </TweaksPanel>

      {/* Page header */}
      <header className="px-10 pt-10 pb-6 max-w-[1280px] mx-auto">
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <div>
            <div className="sec-title mb-2">Claude Design · v2.1</div>
            <h1 className="text-[34px] font-extrabold tracking-tight leading-[1.05]">Date picker</h1>
            <p className="sec-sub mt-3">
              Replaces the native <code className="font-mono text-[11px] bg-paper-2 px-1.5 py-0.5 rounded">{'<input type="date">'}</code> in
              Quick&nbsp;Add, the Expenses filter, the Receipt builder, Expense Detail, and the
              Mark-as-Paid transition modal. v2.0 visual vocabulary preserved — warm paper, ink
              text, line borders, rounded-xl, Inter + JetBrains&nbsp;Mono.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-[11.5px] text-ink-3">
            <div className="flex items-center gap-2"><span className="kbd">v2.1</span><span>gap-fill on v2.0</span></div>
            <div>Today (for the demo): <span className="font-mono text-ink-2">Mon 11 May 2026</span></div>
          </div>
        </div>
      </header>

      {/* Hero — picker open with callouts */}
      <SectionWrap id="hero" title="Anatomy" subtitle="Single-date popover, default state. Numbered callouts map to the parts you'll see in the trigger strip below.">
        <div className="grid grid-cols-[auto_1fr] gap-12 items-start mt-6">
          <div className="relative">
            <DatePicker
              mode="single"
              value={singleQA}
              onChange={setSingleQA}
              weekStart={cfg.weekStart}
              todayIndicator={cfg.todayIndicator}
              showJumps={cfg.showJumps}
              emphasizeWeekends={cfg.emphasizeWeekends}
            />
            {/* Callout pins, positioned over the picker */}
            <Pin n="1" style={{top: -8, left: 14}} />
            <Pin n="2" style={{top: 38, left: 14}} />
            <Pin n="3" style={{top: 100, left: 12}} />
            <Pin n="4" style={{bottom: 90, left: -10}} />
            <Pin n="5" style={{bottom: 36, left: 14}} />
          </div>
          <ol className="flex flex-col gap-3 text-[13px] leading-relaxed pt-2 max-w-[42ch]">
            <CalloutItem n="1">
              <b>Month navigation.</b> Click ‹ or › to page months. Month label (May) opens a year grid
              in a future pass — out of scope for v2.1.
            </CalloutItem>
            <CalloutItem n="2">
              <b>Weekday row.</b> Su/Mo/Tu/We/Th/Fr/Sa. Week-start is tweakable (default Sun); the
              row stays sticky regardless of which month is in view.
            </CalloutItem>
            <CalloutItem n="3">
              <b>Day grid.</b> 6 rows × 7 cols — fixed height, so paging between a 28-day Feb and
              31-day May doesn't make the popover shrink and grow. Out-of-month days are dimmed
              but pickable.
            </CalloutItem>
            <CalloutItem n="4">
              <b>Today &amp; selected.</b> Today wears a 1.5px ink ring. The selected day fills with
              ink and inverts text. Keyboard focus shows a brand-orange ring — never collides
              with today.
            </CalloutItem>
            <CalloutItem n="5">
              <b>Quick-jumps + footer.</b> Today / Yesterday / 7 days ago as chips, then a
              keyboard hint strip so power users learn the shortcuts in passing.
            </CalloutItem>
          </ol>
        </div>
      </SectionWrap>

      {/* Triggers in context */}
      <SectionWrap id="triggers" title="Triggers in context"
        subtitle="What the date field looks like when closed, across the five places it appears in the app. All variants share the same trigger primitive — leading calendar icon, smart label, trailing chevron, ink-bordered open state.">
        <div className="grid grid-cols-12 gap-5 mt-6">
          {/* Quick-Add desktop */}
          <Artboard span={4} label="Quick-Add · desktop" usage="routes/QuickAdd.tsx">
            <MiniFieldRow label="Date">
              <DateTrigger value={window.smartLabel(singleQA)} open={false} variant="lg"/>
            </MiniFieldRow>
            <Help>Smart label collapses to <code className="font-mono text-[11px]">Today · 11 May</code> within ±1 day; falls back to <code className="font-mono text-[11px]">Mon, 11 May</code> otherwise.</Help>
          </Artboard>

          {/* Quick-Add mobile */}
          <Artboard span={3} label="Quick-Add · mobile" usage="routes/QuickAdd.tsx">
            <div className="bg-paper p-3 rounded-xl">
              <MiniFieldRow label="Date">
                <DateTrigger value={window.smartLabel(singleQA)} open={false} variant="md"/>
              </MiniFieldRow>
            </div>
            <Help>Trigger size is unchanged; opens as a bottom sheet on mobile (see below).</Help>
          </Artboard>

          {/* Expenses filter */}
          <Artboard span={5} label="Expenses filter · From / To" usage="routes/Expenses.tsx · FilterBar">
            <div className="grid grid-cols-2 gap-2.5">
              <MiniFieldRow label="From">
                <DateTrigger value={window.smartLabel(filterRange.start)} open={false} variant="md"/>
              </MiniFieldRow>
              <MiniFieldRow label="To">
                <DateTrigger value={window.smartLabel(filterRange.end)} open={false} variant="md"/>
              </MiniFieldRow>
            </div>
            <Help>Two single-date triggers wired to one shared range — tapping either opens the same range picker, focused on that endpoint.</Help>
          </Artboard>

          {/* Receipt builder */}
          <Artboard span={5} label="Receipt builder" usage="routes/Receipt.tsx">
            <MiniFieldRow label="Date range">
              <RangeTrigger range={receiptRange} open={false}/>
            </MiniFieldRow>
            <Help>One range trigger replaces the two From/To inputs. Range label compacts to <code className="font-mono text-[11px]">1–11 May</code> when start and end share a month.</Help>
          </Artboard>

          {/* Expense detail */}
          <Artboard span={3} label="Expense Detail · transaction" usage="routes/ExpenseDetail.tsx">
            <MiniFieldRow label="Transaction date">
              <DateTrigger value={window.smartLabel(singleDetail)} open={false} variant="md"/>
            </MiniFieldRow>
            <Help>Same single-date variant as Quick-Add.</Help>
          </Artboard>

          {/* Mark as Paid */}
          <Artboard span={4} label="Mark as Paid · transition modal" usage="ExpenseDetail · ReimbursementPanel">
            <MiniFieldRow label="Paid on">
              <DateTrigger value={window.smartLabel(singlePaid)} open={false} variant="md"/>
            </MiniFieldRow>
            <Help>Inside a confirm modal — same trigger, opens its popover above the modal scrim.</Help>
          </Artboard>
        </div>
      </SectionWrap>

      {/* Range picker — Receipt builder */}
      <SectionWrap id="range-presets" title="Range picker with presets"
        subtitle="The Receipt builder's date-range selector. Presets cover every common 'this month / last week / YTD' ask so most users never touch the grid. Custom clears the range to keep manual selection unambiguous.">
        <div className="mt-6 flex items-start gap-10 flex-wrap">
          <div>
            <ArtboardLabel>{t.presetPlacement === 'sidebar' ? 'Sidebar layout (default)' : 'Top bar layout'}{t.twoMonthRange ? ' · two-month' : ' · single-month'}</ArtboardLabel>
            <DatePicker
              mode="range"
              value={receiptRange}
              onChange={setReceiptRange}
              presets={t.presetPlacement}
              twoMonths={t.twoMonthRange}
              weekStart={cfg.weekStart}
              todayIndicator={cfg.todayIndicator}
              emphasizeWeekends={cfg.emphasizeWeekends}
            />
          </div>
          <div className="max-w-[36ch] pt-1 flex flex-col gap-2.5 text-[12.5px] leading-relaxed text-ink-2">
            <p><b className="text-ink">Anchor → end.</b> First click sets the start; second click commits the end. Sorting is automatic — second click before first still ends up [start, end].</p>
            <p><b className="text-ink">Hover preview.</b> Between click 1 and click 2, the grid paints a paper-2 tint from the anchor to wherever the cursor is, so the user sees what they're about to commit before they commit.</p>
            <p><b className="text-ink">Endpoints get the ink fill.</b> The in-between days only get the tint — keeps the visual hierarchy clear when ranges span multiple weeks.</p>
            <p className="text-ink-3 pt-1 border-t border-line">Tweak <i>Preset placement</i> in the panel to compare sidebar vs. top-bar chip row. Tweak <i>Two-month range</i> to see the wider variant — good for ranges that cross months.</p>
          </div>
        </div>
      </SectionWrap>

      {/* Range, no presets — filter */}
      <SectionWrap id="range-compact" title="Range picker, compact"
        subtitle="The Expenses filter version. No presets — the filter row already exposes 'This month' as a separate quick-action above the table, so the picker only has to handle ad-hoc ranges.">
        <div className="mt-6 flex items-start gap-10 flex-wrap">
          <DatePicker
            mode="range"
            value={filterRange}
            onChange={setFilterRange}
            presets={null}
            weekStart={cfg.weekStart}
            todayIndicator={cfg.todayIndicator}
            emphasizeWeekends={cfg.emphasizeWeekends}
          />
          <div className="max-w-[36ch] pt-1 flex flex-col gap-2.5 text-[12.5px] leading-relaxed text-ink-2">
            <p><b className="text-ink">Single column.</b> ~280px wide; fits next to the filter inputs without crowding.</p>
            <p><b className="text-ink">Two triggers, one picker.</b> The From and To buttons in the filter both open the same picker. Whichever is tapped becomes the active anchor — so tapping <i>To</i> first lets the user grab a "back to {'<date>'}" range without an empty intermediate state.</p>
          </div>
        </div>
      </SectionWrap>

      {/* Mobile bottom sheets */}
      <SectionWrap id="mobile" title="Mobile · bottom sheet"
        subtitle="On viewports under md, the popover docks to the bottom of the screen and tap targets bump to 40px. The picker body is identical — same component, different host.">
        <div className="grid grid-cols-2 gap-8 mt-6 max-w-[820px]">
          <PhoneFrame label="Quick-Add · single">
            <MobileSheet title="Pick a date">
              <DatePicker
                mode="single"
                value={singleQA}
                onChange={setSingleQA}
                weekStart={cfg.weekStart}
                todayIndicator={cfg.todayIndicator}
                showJumps={cfg.showJumps}
                showFooter={false}
                inSheet
              />
              <div className="px-4 py-3 border-t border-line flex gap-2">
                <button className="flex-1 py-2.5 rounded-xl border border-line text-[13px] font-medium text-ink-2">Cancel</button>
                <button className="flex-1 py-2.5 rounded-xl bg-ink text-paper text-[13px] font-semibold">Done</button>
              </div>
            </MobileSheet>
          </PhoneFrame>
          <PhoneFrame label="Receipt · range with presets (top bar)">
            <MobileSheet title="Date range">
              <DatePicker
                mode="range"
                value={receiptRange}
                onChange={setReceiptRange}
                presets="topbar"
                weekStart={cfg.weekStart}
                todayIndicator={cfg.todayIndicator}
                showFooter={false}
                inSheet
              />
              <div className="px-4 py-3 border-t border-line flex gap-2">
                <button className="flex-1 py-2.5 rounded-xl border border-line text-[13px] font-medium text-ink-2">Cancel</button>
                <button className="flex-1 py-2.5 rounded-xl bg-ink text-paper text-[13px] font-semibold">Done</button>
              </div>
            </MobileSheet>
          </PhoneFrame>
        </div>
        <Help className="mt-3">On mobile, presets go in a horizontally-scrollable top bar — sidebar wastes too much real estate at narrow widths.</Help>
      </SectionWrap>

      {/* Mark-as-Paid modal */}
      <SectionWrap id="modal" title="In modal · transition date"
        subtitle="The Mark as Paid / Mark as Pending flow asks for a date as part of the state machine. Picker swaps in for the native input the modal currently renders — same modal scrim, same Cancel / Apply buttons.">
        <div className="mt-6 flex items-start gap-10">
          <ModalDemo onDate={setSinglePaid} value={singlePaid} weekStart={cfg.weekStart} todayIndicator={cfg.todayIndicator} showJumps={cfg.showJumps}/>
          <div className="max-w-[36ch] pt-2 flex flex-col gap-2.5 text-[12.5px] leading-relaxed text-ink-2">
            <p><b className="text-ink">Inline, not popover.</b> The modal is already a focused dialog — pushing the picker into a second floating layer is fussier than dropping it directly into the modal body.</p>
            <p><b className="text-ink">Footer hint hidden.</b> The keyboard map row collapses inside modals; the modal's own Apply button is the obvious next step.</p>
            <p><b className="text-ink">Single-date only.</b> Both transitions (<code className="font-mono text-[11px]">paidAt</code>, <code className="font-mono text-[11px]">receivedAt</code>) need one date each.</p>
          </div>
        </div>
      </SectionWrap>

      {/* Keyboard map + state legend */}
      <SectionWrap id="reference" title="Reference">
        <div className="grid grid-cols-2 gap-10 mt-4">
          <div>
            <ArtboardLabel className="mb-3">Keyboard map</ArtboardLabel>
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[12.5px] items-center">
              <KbdRow keys={['←','→']}>Previous / next day</KbdRow>
              <KbdRow keys={['↑','↓']}>Previous / next week</KbdRow>
              <KbdRow keys={['PgUp','PgDn']}>Previous / next month</KbdRow>
              <KbdRow keys={['⇧','PgUp']}>Previous year</KbdRow>
              <KbdRow keys={['⇧','PgDn']}>Next year</KbdRow>
              <KbdRow keys={['Home']}>Start of week</KbdRow>
              <KbdRow keys={['End']}>End of week</KbdRow>
              <KbdRow keys={['T']}>Jump to today</KbdRow>
              <KbdRow keys={['⏎']}>Select focused day (or commit range end)</KbdRow>
              <KbdRow keys={['Esc']}>Close the popover</KbdRow>
            </div>
          </div>
          <div>
            <ArtboardLabel className="mb-3">Cell states</ArtboardLabel>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[12.5px]">
              <StateSwatch state="default">Default</StateSwatch>
              <StateSwatch state="hover">Hover</StateSwatch>
              <StateSwatch state="today">Today</StateSwatch>
              <StateSwatch state="selected">Selected</StateSwatch>
              <StateSwatch state="focused">Keyboard focus</StateSwatch>
              <StateSwatch state="in-range">In range</StateSwatch>
              <StateSwatch state="range-end">Range endpoint</StateSwatch>
              <StateSwatch state="out">Out of month</StateSwatch>
            </div>
          </div>
        </div>
      </SectionWrap>

      <footer className="px-10 py-10 max-w-[1280px] mx-auto text-[11.5px] text-ink-3 border-t border-line/60 mt-12">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>Claude Design v2.1 · supersedes the native <code className="font-mono">{'<input type="date">'}</code> in 5 places. See <span className="font-mono">design-todos.md</span> § Milestone&nbsp;I · "Date picker".</div>
          <div>Next pass: <span className="font-mono">v2.2</span> — Receipt print stylesheet + Pending transition note.</div>
        </div>
      </footer>
    </div>
  );
}

// ─── Layout primitives ────────────────────────────────────────────────────
function SectionWrap({ id, title, subtitle, children }){
  return (
    <section id={id} className="px-10 py-8 max-w-[1280px] mx-auto border-t border-line/60">
      <div className="flex items-baseline gap-5">
        <h2 className="sec-h2">{title}</h2>
      </div>
      {subtitle && <p className="sec-sub mt-2">{subtitle}</p>}
      {children}
    </section>
  );
}

function Artboard({ span = 6, label, usage, children }){
  return (
    <div className="flex flex-col gap-2" style={{gridColumn: `span ${span} / span ${span}`}}>
      <div className="flex items-baseline justify-between gap-2">
        <ArtboardLabel>{label}</ArtboardLabel>
        {usage && <span className="artboard-mono">{usage}</span>}
      </div>
      <div className="artboard p-4">
        {children}
      </div>
    </div>
  );
}

function ArtboardLabel({ children, className = '' }){
  return <div className={'artboard-label ' + className}>{children}</div>;
}

function MiniFieldRow({ label, children }){
  return (
    <div>
      {label && <div className="text-[10.5px] uppercase tracking-wider text-ink-3 font-semibold mb-1.5">{label}</div>}
      {children}
    </div>
  );
}

function Help({ children, className = '' }){
  return <p className={`mt-3 text-[11.5px] text-ink-3 leading-relaxed ${className}`}>{children}</p>;
}

function CalloutItem({ n, children }){
  return (
    <li className="flex items-start gap-3">
      <span className="callout-pin flex-shrink-0 mt-0.5">{n}</span>
      <span className="text-ink-2">{children}</span>
    </li>
  );
}

function Pin({ n, style }){
  return <span className="callout-pin absolute" style={style}>{n}</span>;
}

function KbdRow({ keys, children }){
  return (
    <>
      <div className="flex items-center gap-1">
        {keys.map((k,i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-ink-3 text-[11px]">+</span>}
            <span className="kbd">{k}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="text-ink-2">{children}</div>
    </>
  );
}

function StateSwatch({ state, children }){
  const cellProps = { className: 'cal-cell text-[13px]', style: { width: 34, height: 34, flexShrink: 0 } };
  let inner;
  switch (state){
    case 'default':   inner = <div {...cellProps}>11</div>; break;
    case 'hover':     inner = <div {...cellProps} style={{...cellProps.style, background: 'var(--color-paper-2)'}}>11</div>; break;
    case 'today':     inner = <div {...cellProps} data-today>11</div>; break;
    case 'selected':  inner = <div {...cellProps} data-selected>11</div>; break;
    case 'focused':   inner = <div {...cellProps} data-focused>11</div>; break;
    case 'in-range':  inner = <div {...cellProps} data-in-range>11</div>; break;
    case 'range-end': inner = <div {...cellProps} data-selected data-range-end>11</div>; break;
    case 'out':       inner = <div {...cellProps} data-out>11</div>; break;
    default:          inner = <div {...cellProps}>11</div>;
  }
  return (
    <div className="flex items-center gap-3">
      {inner}
      <span className="text-ink-2">{children}</span>
    </div>
  );
}

// ─── Mobile sheet shell ───────────────────────────────────────────────────
function PhoneFrame({ label, children }){
  return (
    <div>
      <ArtboardLabel className="mb-2">{label}</ArtboardLabel>
      <div className="bg-ink rounded-[36px] p-2.5" style={{boxShadow: '0 24px 60px -24px rgba(40,30,20,0.45)'}}>
        <div className="bg-paper rounded-[28px] overflow-hidden relative" style={{height: 540, width: 320}}>
          {/* Mock content behind the sheet */}
          <div className="absolute inset-0 p-5">
            <div className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold">Quick Add</div>
            <h3 className="text-[18px] font-bold mt-0.5">Record an expense</h3>
            <div className="mt-4 h-16 rounded-2xl border-2 border-ink bg-white"/>
            <div className="mt-3 h-10 rounded-xl border border-line bg-white"/>
            <div className="absolute inset-0 bg-ink/30"/>
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-paper rounded-t-[24px] overflow-hidden" style={{boxShadow: '0 -8px 24px -8px rgba(40,30,20,0.25)'}}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileSheet({ title, children }){
  return (
    <>
      <div className="pt-2.5 pb-1 flex justify-center">
        <div className="w-9 h-1 rounded-full bg-line"/>
      </div>
      <div className="px-4 pt-1 pb-3 flex items-center justify-between">
        <div className="text-[13px] font-semibold">{title}</div>
        <button className="text-[12px] text-ink-3">Close</button>
      </div>
      <div className="flex flex-col">
        {children}
      </div>
    </>
  );
}

// ─── Modal demo (Mark as Paid) ────────────────────────────────────────────
function ModalDemo({ value, onDate, weekStart, todayIndicator, showJumps }){
  return (
    <div>
      <ArtboardLabel className="mb-2">Mark as Paid · modal</ArtboardLabel>
      <div className="relative rounded-2xl overflow-hidden artboard" style={{width: 460, padding: 0}}>
        {/* Faux page behind */}
        <div className="absolute inset-0 bg-paper-2/60"/>
        <div className="absolute inset-0 bg-ink/20"/>
        {/* Modal card */}
        <div className="relative bg-white p-5 m-6 rounded-2xl" style={{boxShadow: '0 18px 48px -16px rgba(40,30,20,0.25)'}}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[15px] font-semibold">Mark as Paid</h3>
            <button className="text-ink-3 hover:text-ink">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <p className="text-[12px] text-ink-3 mb-3">Pick the payment date.</p>
          <DatePicker
            mode="single"
            value={value}
            onChange={onDate}
            weekStart={weekStart}
            todayIndicator={todayIndicator}
            showJumps={showJumps}
            showFooter={false}
          />
          <div className="mt-4 flex gap-2">
            <button className="flex-1 py-2 rounded-lg border border-line text-[13px] font-medium hover:bg-paper-2">Cancel</button>
            <button className="flex-1 py-2 rounded-lg bg-ink text-paper text-[13px] font-semibold hover:bg-ink-2">Apply</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);

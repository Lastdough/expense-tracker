// ─────────────────────────────────────────────────────────────────────────
// DatePicker · v2.1
// Single-date and date-range picker for the warm-paper expense tracker.
// Replaces the native <input type="date"> in QuickAdd / Expenses filter /
// Receipt builder / ExpenseDetail / Mark-as-Paid transition modal.
//
// Anatomy (top → bottom, default layout):
//   1. Trigger (caller-supplied; this file ships <DateTrigger />)
//   2. Popover header     · ‹ May 2026 › with month/year clickable
//   3. Quick-jump chips   · Today / Yesterday / This week (single-date)
//      OR Preset sidebar  · Today / Yesterday / This week / Last week /
//                           This month / Last month / Last 30 days /
//                           This year / Custom (range)
//   4. Weekday header     · Su Mo Tu We Th Fr Sa (Sun-start by default;
//                           tweakable to Mon-start)
//   5. Day grid           · 6 weeks × 7 days, fixed height so prev/next
//                           month doesn't reflow the popover
//   6. Footer hint        · keyboard map summary on hover/focus
//
// Keyboard map:
//   ← / →     prev / next day
//   ↑ / ↓     prev / next week
//   PgUp / Dn prev / next month
//   ⇧ PgUp/Dn prev / next year
//   Home/End  start / end of week
//   T         today
//   Enter     select (or commit range end)
//   Esc       close
// ─────────────────────────────────────────────────────────────────────────

const { useState, useEffect, useMemo, useRef, useCallback } = React;

// "Today" for the design — Mon 11 May 2026, matching the v2.0 sample data.
window.__TODAY__ = new Date(2026, 4, 11);

const DOW_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const DOW_LONG = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function toIso(d){
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
}
function fromIso(s){
  if (!s) return null;
  const [y,m,d] = s.split('-').map(Number);
  return new Date(y, m-1, d);
}
function isSameDay(a,b){
  return a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function isSameMonth(a,b){
  return a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth();
}
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function addMonths(d,n){ const x=new Date(d); x.setMonth(x.getMonth()+n); return x; }
function startOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }
function startOfWeek(d, weekStart=0){
  const x = new Date(d);
  const diff = (x.getDay() - weekStart + 7) % 7;
  x.setDate(x.getDate() - diff);
  return x;
}
function endOfWeek(d, weekStart=0){ return addDays(startOfWeek(d, weekStart), 6); }

// Smart label for triggers — collapses to "Today", "Yesterday", "Tomorrow"
// when within 1 day of today; otherwise long-form. The dot separator is for
// the "Today · 11 May" pattern from the design.
function smartLabel(d, opts={}){
  if (!d) return opts.placeholder || 'Pick a date';
  const today = window.__TODAY__;
  const tag =
    isSameDay(d, today) ? 'Today' :
    isSameDay(d, addDays(today,-1)) ? 'Yesterday' :
    isSameDay(d, addDays(today,1)) ? 'Tomorrow' : null;
  const datePart = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  const yearPart = d.getFullYear() === today.getFullYear() ? '' : ` ${d.getFullYear()}`;
  if (tag) return `${tag} · ${datePart}`;
  return `${DOW_LONG[d.getDay()]}, ${datePart}${yearPart}`;
}

function rangeLabel(range, opts={}){
  if (!range || (!range.start && !range.end)) return opts.placeholder || 'Pick a range';
  if (range.start && !range.end) return `${smartLabel(range.start)} — …`;
  if (!range.start && range.end) return `… — ${smartLabel(range.end)}`;
  const sameYear = range.start.getFullYear() === range.end.getFullYear();
  const sameMonth = sameYear && range.start.getMonth() === range.end.getMonth();
  const today = window.__TODAY__;
  if (sameMonth) {
    return `${range.start.getDate()}–${range.end.getDate()} ${MONTHS_SHORT[range.end.getMonth()]}` +
      (range.end.getFullYear() === today.getFullYear() ? '' : ` ${range.end.getFullYear()}`);
  }
  if (sameYear) {
    return `${range.start.getDate()} ${MONTHS_SHORT[range.start.getMonth()]} – ${range.end.getDate()} ${MONTHS_SHORT[range.end.getMonth()]}` +
      (range.end.getFullYear() === today.getFullYear() ? '' : ` ${range.end.getFullYear()}`);
  }
  return `${range.start.getDate()} ${MONTHS_SHORT[range.start.getMonth()]} ${range.start.getFullYear()} – ${range.end.getDate()} ${MONTHS_SHORT[range.end.getMonth()]} ${range.end.getFullYear()}`;
}

// ─── Presets (range) ─────────────────────────────────────────────────────
function rangePresets(today = window.__TODAY__){
  const dayOfWeek = today.getDay();
  const thisWeekStart = addDays(today, -dayOfWeek);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const lastWeekEnd = addDays(thisWeekStart, -1);
  return [
    { id: 'today',     label: 'Today',        start: today,                          end: today },
    { id: 'yesterday', label: 'Yesterday',    start: addDays(today,-1),              end: addDays(today,-1) },
    { id: 'this-wk',   label: 'This week',    start: thisWeekStart,                  end: today },
    { id: 'last-wk',   label: 'Last week',    start: lastWeekStart,                  end: lastWeekEnd },
    { id: 'this-mo',   label: 'This month',   start: startOfMonth(today),            end: today },
    { id: 'last-mo',   label: 'Last month',   start: startOfMonth(addMonths(today,-1)), end: endOfMonth(addMonths(today,-1)) },
    { id: 'last-30',   label: 'Last 30 days', start: addDays(today,-29),             end: today },
    { id: 'ytd',       label: 'Year to date', start: new Date(today.getFullYear(),0,1), end: today },
    { id: 'custom',    label: 'Custom',       start: null,                           end: null },
  ];
}

// Quick-jumps (single-date) — a small chip row.
function singleJumps(today = window.__TODAY__){
  return [
    { id: 'today',     label: 'Today',      date: today },
    { id: 'yesterday', label: 'Yesterday',  date: addDays(today,-1) },
    { id: '7-ago',     label: '7 days ago', date: addDays(today,-7) },
  ];
}

// ─── Day grid builder ────────────────────────────────────────────────────
// Always 6 rows × 7 cols so the popover height is stable when paging months.
function buildGrid(viewMonth, weekStart=0){
  const first = startOfMonth(viewMonth);
  const gridStart = startOfWeek(first, weekStart);
  return Array.from({length: 42}, (_, i) => addDays(gridStart, i));
}

// ─── DatePicker (core) ───────────────────────────────────────────────────
// Stateless about open/close — caller wraps in <Popover> or <BottomSheet>.
function DatePicker({
  mode = 'single',          // 'single' | 'range'
  value = null,             // Date | { start, end } | null
  onChange,                 // (next) => void
  onCommit,                 // (next) => void  — fires when range fully chosen
  weekStart = 0,            // 0 = Sun, 1 = Mon
  showJumps = true,         // single-date: show Today/Yesterday/7d chips
  presets = null,           // range: 'sidebar' | 'topbar' | null (= sidebar)
  twoMonths = false,        // range: render two side-by-side months
  todayIndicator = 'ring',  // 'ring' | 'label'
  initialMonth,             // Date — defaults to value or today
  showFooter = true,
  emphasizeWeekends = false,
  autoFocus = false,
  inSheet = false,           // mobile bottom-sheet host: render edge-to-edge, no chrome
}){
  const today = window.__TODAY__;
  const isRange = mode === 'range';
  const initial = initialMonth || (
    isRange ? (value?.start || value?.end || today) : (value || today)
  );
  const [viewMonth, setViewMonth] = useState(startOfMonth(initial));
  const [focusDate, setFocusDate] = useState(initial);
  const [hoverDate, setHoverDate] = useState(null);
  const [pendingStart, setPendingStart] = useState(isRange ? value?.start || null : null);
  const [pendingEnd, setPendingEnd] = useState(isRange ? value?.end || null : null);
  const gridRef = useRef(null);

  useEffect(() => {
    if (autoFocus && gridRef.current) {
      const el = gridRef.current.querySelector('[data-focused]');
      el?.focus?.();
    }
  }, [autoFocus]);

  // Range derived: anchor = the first click, displayEnd = second click or hover.
  const anchorStart = pendingStart;
  const anchorEnd   = pendingEnd;
  // When choosing the END, hover preview shows tentative range.
  const previewEnd = (anchorStart && !anchorEnd) ? hoverDate : anchorEnd;
  const previewLo = anchorStart && previewEnd
    ? (anchorStart.getTime() <= previewEnd.getTime() ? anchorStart : previewEnd)
    : null;
  const previewHi = anchorStart && previewEnd
    ? (anchorStart.getTime() <= previewEnd.getTime() ? previewEnd : anchorStart)
    : null;

  const presetList = useMemo(() => rangePresets(today), [today]);
  const jumpList   = useMemo(() => singleJumps(today), [today]);

  const handleDay = (d) => {
    setFocusDate(d);
    if (!isSameMonth(d, viewMonth)) setViewMonth(startOfMonth(d));
    if (!isRange) {
      onChange?.(d);
      onCommit?.(d);
      return;
    }
    if (!anchorStart || (anchorStart && anchorEnd)) {
      // Start a new range
      setPendingStart(d);
      setPendingEnd(null);
      onChange?.({ start: d, end: null });
    } else {
      // Commit the end (sort so start <= end)
      const lo = anchorStart.getTime() <= d.getTime() ? anchorStart : d;
      const hi = anchorStart.getTime() <= d.getTime() ? d : anchorStart;
      setPendingStart(lo);
      setPendingEnd(hi);
      onChange?.({ start: lo, end: hi });
      onCommit?.({ start: lo, end: hi });
    }
  };

  const handleKey = (e) => {
    let next = focusDate;
    switch (e.key) {
      case 'ArrowLeft':  next = addDays(focusDate, -1); break;
      case 'ArrowRight': next = addDays(focusDate, 1); break;
      case 'ArrowUp':    next = addDays(focusDate, -7); break;
      case 'ArrowDown':  next = addDays(focusDate, 7); break;
      case 'Home':       next = startOfWeek(focusDate, weekStart); break;
      case 'End':        next = endOfWeek(focusDate, weekStart); break;
      case 'PageUp':     next = e.shiftKey ? addMonths(focusDate, -12) : addMonths(focusDate, -1); break;
      case 'PageDown':   next = e.shiftKey ? addMonths(focusDate, 12)  : addMonths(focusDate, 1); break;
      case 't': case 'T': next = today; break;
      case 'Enter':      e.preventDefault(); handleDay(focusDate); return;
      case 'Escape':     e.stopPropagation(); return;
      default: return;
    }
    e.preventDefault();
    setFocusDate(next);
    if (!isSameMonth(next, viewMonth)) setViewMonth(startOfMonth(next));
  };

  const applyPreset = (p) => {
    if (p.id === 'custom') {
      setPendingStart(null); setPendingEnd(null);
      onChange?.({ start: null, end: null });
      return;
    }
    setPendingStart(p.start);
    setPendingEnd(p.end);
    setViewMonth(startOfMonth(p.end));
    setFocusDate(p.end);
    onChange?.({ start: p.start, end: p.end });
    onCommit?.({ start: p.start, end: p.end });
  };

  const months = twoMonths ? [viewMonth, addMonths(viewMonth, 1)] : [viewMonth];

  return (
    <div
      className={inSheet ? "bg-white w-full" : "bg-white rounded-2xl"}
      style={{
        ...(inSheet ? {} : {
          border: '1px solid var(--color-line)',
          boxShadow: '0 18px 48px -16px rgba(40,30,20,0.25), 0 2px 6px rgba(40,30,20,0.05)',
        }),
        display: inSheet ? 'flex' : 'inline-flex',
        flexDirection: (!inSheet && presets === 'sidebar') ? 'row' : 'column',
        width: inSheet ? '100%' : undefined,
        overflow: 'hidden',
        minWidth: 0,
      }}
      onKeyDown={handleKey}
      tabIndex={-1}
    >
      {/* Preset sidebar (range only) */}
      {isRange && presets === 'sidebar' && (
        <div className="border-r border-line py-2.5 px-2 flex flex-col gap-0.5" style={{minWidth: 132, background: 'var(--color-paper)'}}>
          <div className="sec-title px-2 pt-1 pb-1.5">Presets</div>
          {presetList.map(p => {
            const active = isSameDay(p.start, anchorStart) && isSameDay(p.end, anchorEnd);
            return (
              <button key={p.id} type="button" onClick={() => applyPreset(p)}
                className="preset-btn" aria-pressed={active}>
                {p.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-col" style={{minWidth: 0}}>
        {/* Top preset chips (range, 'topbar') OR quick-jump chips (single) */}
        {(isRange && presets === 'topbar') && (
          <div className="px-3 pt-3 pb-2 border-b border-line flex flex-wrap gap-1.5 bg-paper">
            {presetList.filter(p => p.id !== 'custom').map(p => {
              const active = isSameDay(p.start, anchorStart) && isSameDay(p.end, anchorEnd);
              return (
                <button key={p.id} type="button" onClick={() => applyPreset(p)} className="jump-chip" aria-pressed={active}>
                  {p.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Header + months */}
        <div className="px-3.5 pt-3 pb-3 flex" style={{gap: twoMonths ? 18 : 0, flexDirection: twoMonths ? 'row' : 'column'}}>
          {months.map((m, idx) => (
            <MonthBlock
              key={idx}
              monthDate={m}
              weekStart={weekStart}
              isFirstOfTwo={twoMonths && idx === 0}
              isLastOfTwo={twoMonths && idx === months.length - 1}
              isSingleMonth={!twoMonths}
              onPrev={() => setViewMonth(addMonths(viewMonth, -1))}
              onNext={() => setViewMonth(addMonths(viewMonth, 1))}
              focusDate={focusDate}
              hoverDate={hoverDate}
              setHoverDate={setHoverDate}
              today={today}
              todayIndicator={todayIndicator}
              isRange={isRange}
              singleValue={!isRange ? value : null}
              anchorStart={anchorStart}
              previewLo={previewLo}
              previewHi={previewHi}
              onPick={handleDay}
              emphasizeWeekends={emphasizeWeekends}
            />
          ))}
        </div>

        {/* Single-date quick-jumps */}
        {!isRange && showJumps && (
          <div className="px-3.5 pb-3 -mt-1 flex flex-wrap gap-1.5">
            {jumpList.map(j => {
              const active = isSameDay(j.date, value);
              return (
                <button key={j.id} type="button" onClick={() => handleDay(j.date)} className="jump-chip" aria-pressed={active}>
                  {j.label}
                </button>
              );
            })}
          </div>
        )}

        {showFooter && (
          <div className="px-3.5 py-2 border-t border-line flex items-center justify-between bg-paper"
               style={{fontSize: 11, color: 'var(--color-ink-3)'}}>
            <div className="flex items-center gap-1.5">
              <span className="kbd">↑↓←→</span>
              <span>navigate</span>
              <span className="kbd ml-2">⏎</span>
              <span>select</span>
              <span className="kbd ml-2">T</span>
              <span>today</span>
            </div>
            {isRange && anchorStart && !anchorEnd && (
              <span className="font-medium" style={{color: 'var(--color-ink-2)'}}>
                Pick the end date…
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MonthBlock({
  monthDate, weekStart, isFirstOfTwo, isLastOfTwo, isSingleMonth,
  onPrev, onNext, focusDate, hoverDate, setHoverDate, today, todayIndicator,
  isRange, singleValue, anchorStart, previewLo, previewHi, onPick, emphasizeWeekends
}){
  const cells = useMemo(() => buildGrid(monthDate, weekStart), [monthDate, weekStart]);
  const showPrev = isSingleMonth || isFirstOfTwo;
  const showNext = isSingleMonth || isLastOfTwo;
  const weekdayOrder = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 7; i++) arr.push(DOW_SHORT[(weekStart + i) % 7]);
    return arr;
  }, [weekStart]);

  return (
    <div style={{minWidth: 248}}>
      {/* Month header */}
      <div className="flex items-center justify-between mb-2.5">
        {showPrev ? (
          <button type="button" onClick={onPrev}
            className="w-7 h-7 rounded-lg hover:bg-paper-2 flex items-center justify-center text-ink-2"
            aria-label="Previous month">
            <Chev dir="left"/>
          </button>
        ) : <div className="w-7 h-7"/>}
        <div className="text-[13.5px] font-semibold tracking-tight">
          {MONTHS[monthDate.getMonth()]} <span className="font-mono font-medium text-ink-3">{monthDate.getFullYear()}</span>
        </div>
        {showNext ? (
          <button type="button" onClick={onNext}
            className="w-7 h-7 rounded-lg hover:bg-paper-2 flex items-center justify-center text-ink-2"
            aria-label="Next month">
            <Chev dir="right"/>
          </button>
        ) : <div className="w-7 h-7"/>}
      </div>

      {/* Weekday row */}
      <div className="cal-grid mb-1">
        {weekdayOrder.map((w,i) => (
          <div key={i} className="text-center text-[10.5px] font-semibold uppercase tracking-wider text-ink-3 py-1">
            {w}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="cal-grid">
        {cells.map((d, idx) => {
          const inMonth = d.getMonth() === monthDate.getMonth();
          const isToday = isSameDay(d, today);
          const isFocus = isSameDay(d, focusDate);
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          let selected = false, inRange = false, rangeStart = false, rangeEnd = false;
          if (isRange) {
            if (previewLo && previewHi) {
              if (d.getTime() >= previewLo.getTime() && d.getTime() <= previewHi.getTime()) {
                inRange = true;
                if (isSameDay(d, previewLo)) rangeStart = true;
                if (isSameDay(d, previewHi)) rangeEnd = true;
                // Endpoints are "selected" for paint
                if (rangeStart || rangeEnd) selected = true;
                if (rangeStart || rangeEnd) inRange = false;
              }
            } else if (anchorStart) {
              if (isSameDay(d, anchorStart)) { selected = true; rangeStart = true; }
            }
          } else {
            if (isSameDay(d, singleValue)) selected = true;
          }
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onPick(d)}
              onMouseEnter={() => isRange && setHoverDate(d)}
              onMouseLeave={() => isRange && setHoverDate(null)}
              className="cal-cell text-[13px]"
              style={{height: 34}}
              data-out={!inMonth || undefined}
              data-today={isToday && todayIndicator === 'ring' || undefined}
              data-selected={selected || undefined}
              data-in-range={inRange || undefined}
              data-range-start={rangeStart || undefined}
              data-range-end={rangeEnd || undefined}
              data-focused={isFocus || undefined}
              data-weekend={emphasizeWeekends && isWeekend || undefined}
            >
              {todayIndicator === 'label' && isToday && !selected ? (
                <span className="relative">
                  {d.getDate()}
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{background: 'var(--color-ink-2)'}}/>
                </span>
              ) : d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Chev({ dir = 'down' }){
  const rot = dir === 'left' ? 90 : dir === 'right' ? -90 : dir === 'up' ? 180 : 0;
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{transform: `rotate(${rot}deg)`}}>
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}

// ─── Triggers ─────────────────────────────────────────────────────────────
// Visual: looks like the existing input fields in v2.0 (white bg, line
// border, rounded-xl, calendar icon prefix, chevron suffix). Open state has
// a dark "ink" border to echo the focus-ring convention.
function DateTrigger({ value, onClick, open, placeholder, variant = 'lg', icon = true, label }){
  const sizing =
    variant === 'sm' ? 'px-2.5 py-1.5 text-[12px]' :
    variant === 'md' ? 'px-3 py-2 text-[12.5px]' :
    'px-3.5 py-2.5 text-[13px]';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center justify-between gap-2 rounded-xl border bg-white transition w-full ${sizing}`}
      style={{
        borderColor: open ? 'var(--color-ink)' : 'var(--color-line)',
        boxShadow: open ? '0 0 0 3px rgba(10,9,8,0.08)' : 'none',
      }}
      aria-haspopup="dialog"
      aria-expanded={!!open}
    >
      <span className="flex items-center gap-2 min-w-0">
        {icon && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
               className="text-ink-3 flex-shrink-0">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
        )}
        {label && <span className="text-ink-3 mr-0.5">{label}</span>}
        <span className={`truncate font-medium ${value ? 'text-ink' : 'text-ink-3'}`}>
          {value || placeholder || 'Pick a date'}
        </span>
      </span>
      <Chev dir="down"/>
    </button>
  );
}

function RangeTrigger({ range, onClick, open, placeholder }){
  return (
    <DateTrigger
      value={range && (range.start || range.end) ? rangeLabel(range) : null}
      onClick={onClick} open={open}
      placeholder={placeholder || 'All dates'}
    />
  );
}

// Expose to other Babel scripts
Object.assign(window, {
  DatePicker, DateTrigger, RangeTrigger,
  toIso, fromIso, smartLabel, rangeLabel,
  addDays, addMonths, startOfMonth, endOfMonth, isSameDay,
  MONTHS, MONTHS_SHORT, DOW_SHORT, DOW_LONG,
  Chev,
});

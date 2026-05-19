import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';

// ─── Date primitives (local-only, no shared util yet) ─────────────────────

export type DateRange = { readonly start: Date | null; readonly end: Date | null };

const DOW_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;
const DOW_LONG = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

export function toIso(d: Date | null): string {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function fromIso(s: string | null | undefined): Date | null {
  if (!s) return null;
  const parts = s.split('-');
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return new Date(y, m - 1, d);
}

export function isSameDay(a: Date | null, b: Date | null): boolean {
  return (
    a !== null && b !== null &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function startOfWeek(d: Date, weekStart = 0): Date {
  const x = new Date(d);
  const diff = (x.getDay() - weekStart + 7) % 7;
  x.setDate(x.getDate() - diff);
  return x;
}

function endOfWeek(d: Date, weekStart = 0): Date {
  return addDays(startOfWeek(d, weekStart), 6);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function today(): Date {
  return startOfDay(new Date());
}

// ─── Smart labels ─────────────────────────────────────────────────────────

export function smartLabel(d: Date | null, placeholder = 'Pick a date'): string {
  if (!d) return placeholder;
  const t = today();
  const tag =
    isSameDay(d, t) ? 'Today' :
    isSameDay(d, addDays(t, -1)) ? 'Yesterday' :
    isSameDay(d, addDays(t, 1)) ? 'Tomorrow' :
    null;
  const datePart = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  const yearPart = d.getFullYear() === t.getFullYear() ? '' : ` ${d.getFullYear()}`;
  if (tag) return `${tag} · ${datePart}`;
  return `${DOW_LONG[d.getDay()]}, ${datePart}${yearPart}`;
}

export function rangeLabel(range: DateRange | null, placeholder = 'Pick a range'): string {
  if (!range || (!range.start && !range.end)) return placeholder;
  if (range.start && !range.end) return `${smartLabel(range.start)} — …`;
  if (!range.start && range.end) return `… — ${smartLabel(range.end)}`;
  const s = range.start!;
  const e = range.end!;
  const t = today();
  const sameYear = s.getFullYear() === e.getFullYear();
  const sameMonth = sameYear && s.getMonth() === e.getMonth();
  if (sameMonth) {
    const yearPart = e.getFullYear() === t.getFullYear() ? '' : ` ${e.getFullYear()}`;
    return `${s.getDate()}–${e.getDate()} ${MONTHS_SHORT[e.getMonth()]}${yearPart}`;
  }
  if (sameYear) {
    const yearPart = e.getFullYear() === t.getFullYear() ? '' : ` ${e.getFullYear()}`;
    return `${s.getDate()} ${MONTHS_SHORT[s.getMonth()]} – ${e.getDate()} ${MONTHS_SHORT[e.getMonth()]}${yearPart}`;
  }
  return (
    `${s.getDate()} ${MONTHS_SHORT[s.getMonth()]} ${s.getFullYear()} – ` +
    `${e.getDate()} ${MONTHS_SHORT[e.getMonth()]} ${e.getFullYear()}`
  );
}

// ─── Presets ──────────────────────────────────────────────────────────────

type Preset = {
  readonly id: string;
  readonly label: string;
  readonly start: Date | null;
  readonly end: Date | null;
};

export function rangePresets(now: Date = today()): ReadonlyArray<Preset> {
  const dayOfWeek = now.getDay();
  const thisWeekStart = addDays(now, -dayOfWeek);
  const lastWeekStart = addDays(thisWeekStart, -7);
  const lastWeekEnd = addDays(thisWeekStart, -1);
  return [
    { id: 'today',     label: 'Today',        start: now,                                end: now },
    { id: 'yesterday', label: 'Yesterday',    start: addDays(now, -1),                   end: addDays(now, -1) },
    { id: 'this-wk',   label: 'This week',    start: thisWeekStart,                      end: now },
    { id: 'last-wk',   label: 'Last week',    start: lastWeekStart,                      end: lastWeekEnd },
    { id: 'this-mo',   label: 'This month',   start: startOfMonth(now),                  end: now },
    { id: 'last-mo',   label: 'Last month',   start: startOfMonth(addMonths(now, -1)),   end: endOfMonth(addMonths(now, -1)) },
    { id: 'last-30',   label: 'Last 30 days', start: addDays(now, -29),                  end: now },
    { id: 'ytd',       label: 'Year to date', start: new Date(now.getFullYear(), 0, 1),  end: now },
    { id: 'custom',    label: 'Custom',       start: null,                               end: null },
  ];
}

function singleJumps(now: Date = today()) {
  return [
    { id: 'today',     label: 'Today',      date: now },
    { id: 'yesterday', label: 'Yesterday',  date: addDays(now, -1) },
    { id: '7-ago',     label: '7 days ago', date: addDays(now, -7) },
  ];
}

export function buildGrid(viewMonth: Date, weekStart = 0): ReadonlyArray<Date> {
  const first = startOfMonth(viewMonth);
  const gridStart = startOfWeek(first, weekStart);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

// ─── DatePicker ───────────────────────────────────────────────────────────

interface DatePickerCommonProps {
  readonly weekStart?: 0 | 1;
  readonly todayIndicator?: 'ring' | 'label';
  readonly emphasizeWeekends?: boolean;
  readonly showFooter?: boolean;
  readonly autoFocus?: boolean;
  /** Mobile bottom-sheet host: render edge-to-edge, no chrome */
  readonly inSheet?: boolean;
  readonly initialMonth?: Date;
}

interface SingleProps extends DatePickerCommonProps {
  readonly mode: 'single';
  readonly value: Date | null;
  readonly onChange: (next: Date) => void;
  readonly onCommit?: (next: Date) => void;
  readonly showJumps?: boolean;
}

interface RangeProps extends DatePickerCommonProps {
  readonly mode: 'range';
  readonly value: DateRange;
  readonly onChange: (next: DateRange) => void;
  readonly onCommit?: (next: DateRange) => void;
  readonly presets?: 'sidebar' | 'topbar' | null;
  readonly twoMonths?: boolean;
  /** When opening a range picker from a "To" trigger, seed empty so first click sets a new start. */
  readonly anchorOn?: 'start' | 'end';
}

export type DatePickerProps = SingleProps | RangeProps;

export function DatePicker(props: DatePickerProps) {
  const isRange = props.mode === 'range';
  const weekStart = props.weekStart ?? 0;
  const todayIndicator = props.todayIndicator ?? 'ring';
  const emphasizeWeekends = props.emphasizeWeekends ?? false;
  const showFooter = props.showFooter ?? true;
  const inSheet = props.inSheet ?? false;
  const tdy = today();

  const initial =
    props.initialMonth ??
    (isRange
      ? ((props as RangeProps).value.start ?? (props as RangeProps).value.end ?? tdy)
      : ((props as SingleProps).value ?? tdy));

  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(initial));
  const [focusDate, setFocusDate] = useState<Date>(initial);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const seedStart = isRange
    ? ((props as RangeProps).anchorOn === 'end' ? null : (props as RangeProps).value.start)
    : null;
  const seedEnd = isRange
    ? ((props as RangeProps).anchorOn === 'end' ? null : (props as RangeProps).value.end)
    : null;
  const [pendingStart, setPendingStart] = useState<Date | null>(seedStart);
  const [pendingEnd, setPendingEnd] = useState<Date | null>(seedEnd);

  const gridRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (props.autoFocus && gridRef.current) {
      const el = gridRef.current.querySelector('[data-focused="true"]') as HTMLElement | null;
      el?.focus?.();
    }
  }, [props.autoFocus]);

  const previewEnd = pendingStart && !pendingEnd ? hoverDate : pendingEnd;
  const previewLo =
    pendingStart && previewEnd
      ? pendingStart.getTime() <= previewEnd.getTime() ? pendingStart : previewEnd
      : null;
  const previewHi =
    pendingStart && previewEnd
      ? pendingStart.getTime() <= previewEnd.getTime() ? previewEnd : pendingStart
      : null;

  const presetList = useMemo(() => rangePresets(tdy), [tdy]);
  const jumpList = useMemo(() => singleJumps(tdy), [tdy]);

  const handleDay = (d: Date): void => {
    setFocusDate(d);
    if (!isSameMonth(d, viewMonth)) setViewMonth(startOfMonth(d));
    if (props.mode === 'single') {
      props.onChange(d);
      props.onCommit?.(d);
      return;
    }
    // Range
    if (!pendingStart || (pendingStart && pendingEnd)) {
      setPendingStart(d);
      setPendingEnd(null);
      props.onChange({ start: d, end: null });
      return;
    }
    const lo = pendingStart.getTime() <= d.getTime() ? pendingStart : d;
    const hi = pendingStart.getTime() <= d.getTime() ? d : pendingStart;
    setPendingStart(lo);
    setPendingEnd(hi);
    props.onChange({ start: lo, end: hi });
    props.onCommit?.({ start: lo, end: hi });
  };

  const handleKey = (e: ReactKeyboardEvent<HTMLDivElement>): void => {
    let next = focusDate;
    switch (e.key) {
      case 'ArrowLeft':  next = addDays(focusDate, -1); break;
      case 'ArrowRight': next = addDays(focusDate, 1); break;
      case 'ArrowUp':    next = addDays(focusDate, -7); break;
      case 'ArrowDown':  next = addDays(focusDate, 7); break;
      case 'Home':       next = startOfWeek(focusDate, weekStart); break;
      case 'End':        next = endOfWeek(focusDate, weekStart); break;
      case 'PageUp':     next = e.shiftKey ? addMonths(focusDate, -12) : addMonths(focusDate, -1); break;
      case 'PageDown':   next = e.shiftKey ? addMonths(focusDate, 12) : addMonths(focusDate, 1); break;
      case 't': case 'T': next = tdy; break;
      case 'Enter':      e.preventDefault(); handleDay(focusDate); return;
      case 'Escape':     return;
      default: return;
    }
    e.preventDefault();
    setFocusDate(next);
    if (!isSameMonth(next, viewMonth)) setViewMonth(startOfMonth(next));
  };

  const applyPreset = (p: Preset): void => {
    if (p.id === 'custom') {
      setPendingStart(null);
      setPendingEnd(null);
      if (props.mode === 'range') props.onChange({ start: null, end: null });
      return;
    }
    if (props.mode !== 'range' || !p.start || !p.end) return;
    setPendingStart(p.start);
    setPendingEnd(p.end);
    setViewMonth(startOfMonth(p.end));
    setFocusDate(p.end);
    props.onChange({ start: p.start, end: p.end });
    props.onCommit?.({ start: p.start, end: p.end });
  };

  const rangeProps = props.mode === 'range' ? props : null;
  const months = rangeProps?.twoMonths ? [viewMonth, addMonths(viewMonth, 1)] : [viewMonth];

  const containerStyle: CSSProperties = {
    display: inSheet ? 'flex' : 'inline-flex',
    flexDirection: !inSheet && rangeProps?.presets === 'sidebar' ? 'row' : 'column',
    width: inSheet ? '100%' : undefined,
    overflow: 'hidden',
    minWidth: 0,
    ...(inSheet
      ? {}
      : {
          border: '1px solid var(--color-line)',
          boxShadow: '0 18px 48px -16px rgba(40,30,20,0.25), 0 2px 6px rgba(40,30,20,0.05)',
        }),
  };

  return (
    <div
      ref={gridRef}
      className={inSheet ? 'date-picker bg-white w-full' : 'date-picker bg-white rounded-2xl'}
      style={containerStyle}
      onKeyDown={handleKey}
      tabIndex={-1}
    >
      <DatePickerStyles />

      {isRange && rangeProps?.presets === 'sidebar' && (
        <div
          className="border-r border-line py-2.5 px-2 flex flex-col gap-0.5"
          style={{ minWidth: 132, background: 'var(--color-paper)' }}
        >
          <div className="dp-sec-title px-2 pt-1 pb-1.5">Presets</div>
          {presetList.map((p) => {
            const active = isSameDay(p.start, pendingStart) && isSameDay(p.end, pendingEnd);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                className="dp-preset-btn"
                aria-pressed={active}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-col" style={{ minWidth: 0 }}>
        {isRange && rangeProps?.presets === 'topbar' && (
          <div className="px-3 pt-3 pb-2 border-b border-line flex flex-wrap gap-1.5 bg-paper">
            {presetList
              .filter((p) => p.id !== 'custom')
              .map((p) => {
                const active = isSameDay(p.start, pendingStart) && isSameDay(p.end, pendingEnd);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="dp-jump-chip"
                    aria-pressed={active}
                  >
                    {p.label}
                  </button>
                );
              })}
          </div>
        )}

        <div
          className="px-3.5 pt-3 pb-3 flex"
          style={{ gap: rangeProps?.twoMonths ? 18 : 0, flexDirection: rangeProps?.twoMonths ? 'row' : 'column' }}
        >
          {months.map((m, idx) => (
            <MonthBlock
              key={idx}
              monthDate={m}
              weekStart={weekStart}
              isFirstOfTwo={!!rangeProps?.twoMonths && idx === 0}
              isLastOfTwo={!!rangeProps?.twoMonths && idx === months.length - 1}
              isSingleMonth={!rangeProps?.twoMonths}
              onPrev={() => setViewMonth(addMonths(viewMonth, -1))}
              onNext={() => setViewMonth(addMonths(viewMonth, 1))}
              focusDate={focusDate}
              setHoverDate={setHoverDate}
              today={tdy}
              todayIndicator={todayIndicator}
              isRange={isRange}
              singleValue={props.mode === 'single' ? props.value : null}
              anchorStart={pendingStart}
              previewLo={previewLo}
              previewHi={previewHi}
              onPick={handleDay}
              emphasizeWeekends={emphasizeWeekends}
            />
          ))}
        </div>

        {props.mode === 'single' && (props.showJumps ?? true) && (
          <div className="px-3.5 pb-3 -mt-1 flex flex-wrap gap-1.5">
            {jumpList.map((j) => {
              const active = isSameDay(j.date, props.value);
              return (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => handleDay(j.date)}
                  className="dp-jump-chip"
                  aria-pressed={active}
                >
                  {j.label}
                </button>
              );
            })}
          </div>
        )}

        {showFooter && (
          <div
            className="px-3.5 py-2 border-t border-line flex items-center justify-between bg-paper"
            style={{ fontSize: 11, color: 'var(--color-ink-3)' }}
          >
            <div className="flex items-center gap-1.5">
              <span className="dp-kbd">↑↓←→</span>
              <span>navigate</span>
              <span className="dp-kbd ml-2">⏎</span>
              <span>select</span>
              <span className="dp-kbd ml-2">T</span>
              <span>today</span>
            </div>
            {isRange && pendingStart && !pendingEnd && (
              <span className="font-medium" style={{ color: 'var(--color-ink-2)' }}>
                Pick the end date…
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Month block ──────────────────────────────────────────────────────────

interface MonthBlockProps {
  readonly monthDate: Date;
  readonly weekStart: 0 | 1;
  readonly isFirstOfTwo: boolean;
  readonly isLastOfTwo: boolean;
  readonly isSingleMonth: boolean;
  readonly onPrev: () => void;
  readonly onNext: () => void;
  readonly focusDate: Date;
  readonly setHoverDate: (d: Date | null) => void;
  readonly today: Date;
  readonly todayIndicator: 'ring' | 'label';
  readonly isRange: boolean;
  readonly singleValue: Date | null;
  readonly anchorStart: Date | null;
  readonly previewLo: Date | null;
  readonly previewHi: Date | null;
  readonly onPick: (d: Date) => void;
  readonly emphasizeWeekends: boolean;
}

function MonthBlock(p: MonthBlockProps) {
  const cells = useMemo(() => buildGrid(p.monthDate, p.weekStart), [p.monthDate, p.weekStart]);
  const showPrev = p.isSingleMonth || p.isFirstOfTwo;
  const showNext = p.isSingleMonth || p.isLastOfTwo;
  const weekdayOrder = useMemo(() => {
    const arr: string[] = [];
    for (let i = 0; i < 7; i++) arr.push(DOW_SHORT[(p.weekStart + i) % 7] ?? '');
    return arr;
  }, [p.weekStart]);

  return (
    <div style={{ minWidth: 248 }}>
      <div className="flex items-center justify-between mb-2.5">
        {showPrev ? (
          <button
            type="button"
            onClick={p.onPrev}
            className="w-7 h-7 rounded-lg hover:bg-paper-2 flex items-center justify-center text-ink-2"
            aria-label="Previous month"
          >
            <Chev dir="left" />
          </button>
        ) : (
          <div className="w-7 h-7" />
        )}
        <div className="text-[13.5px] font-semibold tracking-tight">
          {MONTHS[p.monthDate.getMonth()]}{' '}
          <span className="font-mono font-medium text-ink-3">{p.monthDate.getFullYear()}</span>
        </div>
        {showNext ? (
          <button
            type="button"
            onClick={p.onNext}
            className="w-7 h-7 rounded-lg hover:bg-paper-2 flex items-center justify-center text-ink-2"
            aria-label="Next month"
          >
            <Chev dir="right" />
          </button>
        ) : (
          <div className="w-7 h-7" />
        )}
      </div>

      <div className="dp-cal-grid mb-1">
        {weekdayOrder.map((w, i) => (
          <div
            key={i}
            className="text-center text-[10.5px] font-semibold uppercase tracking-wider text-ink-3 py-1"
          >
            {w}
          </div>
        ))}
      </div>

      <div className="dp-cal-grid">
        {cells.map((d, idx) => {
          const inMonth = d.getMonth() === p.monthDate.getMonth();
          const isToday = isSameDay(d, p.today);
          const isFocus = isSameDay(d, p.focusDate);
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          let selected = false;
          let inRange = false;
          let rangeStart = false;
          let rangeEnd = false;
          if (p.isRange) {
            if (p.previewLo && p.previewHi) {
              if (d.getTime() >= p.previewLo.getTime() && d.getTime() <= p.previewHi.getTime()) {
                inRange = true;
                if (isSameDay(d, p.previewLo)) rangeStart = true;
                if (isSameDay(d, p.previewHi)) rangeEnd = true;
                if (rangeStart || rangeEnd) {
                  selected = true;
                  inRange = false;
                }
              }
            } else if (p.anchorStart && isSameDay(d, p.anchorStart)) {
              selected = true;
              rangeStart = true;
            }
          } else if (isSameDay(d, p.singleValue)) {
            selected = true;
          }
          return (
            <button
              key={idx}
              type="button"
              onClick={() => p.onPick(d)}
              onMouseEnter={() => p.isRange && p.setHoverDate(d)}
              onMouseLeave={() => p.isRange && p.setHoverDate(null)}
              className="dp-cal-cell text-[13px]"
              style={{ height: 34 }}
              data-out={!inMonth ? 'true' : undefined}
              data-today={isToday && p.todayIndicator === 'ring' ? 'true' : undefined}
              data-selected={selected ? 'true' : undefined}
              data-in-range={inRange ? 'true' : undefined}
              data-range-start={rangeStart ? 'true' : undefined}
              data-range-end={rangeEnd ? 'true' : undefined}
              data-focused={isFocus ? 'true' : undefined}
              data-weekend={p.emphasizeWeekends && isWeekend ? 'true' : undefined}
            >
              {p.todayIndicator === 'label' && isToday && !selected ? (
                <span className="relative">
                  {d.getDate()}
                  <span
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ background: 'var(--color-ink-2)' }}
                  />
                </span>
              ) : (
                d.getDate()
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Triggers ─────────────────────────────────────────────────────────────

interface DateTriggerProps {
  readonly value: string | null;
  readonly onClick: () => void;
  readonly open?: boolean;
  readonly placeholder?: string;
  readonly variant?: 'sm' | 'md' | 'lg';
  readonly icon?: boolean;
  readonly label?: string;
  readonly id?: string;
}

export function DateTrigger({
  value,
  onClick,
  open = false,
  placeholder = 'Pick a date',
  variant = 'lg',
  icon = true,
  label,
  id,
}: DateTriggerProps) {
  const sizing =
    variant === 'sm' ? 'px-2.5 py-1.5 text-[12px]' :
    variant === 'md' ? 'px-3 py-2 text-[12.5px]' :
    'px-3.5 py-2.5 text-[13px]';
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      className={`group inline-flex items-center justify-between gap-2 rounded-xl border bg-white transition w-full ${sizing}`}
      style={{
        borderColor: open ? 'var(--color-ink)' : 'var(--color-line)',
        boxShadow: open ? '0 0 0 3px rgba(10,9,8,0.08)' : 'none',
      }}
      aria-haspopup="dialog"
      aria-expanded={open}
    >
      <span className="flex items-center gap-2 min-w-0">
        {icon && (
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-ink-3 flex-shrink-0"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        )}
        {label && <span className="text-ink-3 mr-0.5">{label}</span>}
        <span className={`truncate font-medium ${value ? 'text-ink' : 'text-ink-3'}`}>
          {value || placeholder}
        </span>
      </span>
      <Chev dir="down" />
    </button>
  );
}

interface RangeTriggerProps {
  readonly range: DateRange | null;
  readonly onClick: () => void;
  readonly open?: boolean;
  readonly placeholder?: string;
}

export function RangeTrigger({ range, onClick, open = false, placeholder = 'All dates' }: RangeTriggerProps) {
  const label = range && (range.start || range.end) ? rangeLabel(range) : null;
  return <DateTrigger value={label} onClick={onClick} open={open} placeholder={placeholder} />;
}

function Chev({ dir = 'down' }: { readonly dir?: 'up' | 'down' | 'left' | 'right' }) {
  const rot = dir === 'left' ? 90 : dir === 'right' ? -90 : dir === 'up' ? 180 : 0;
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: `rotate(${rot}deg)` }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// ─── Inline styles for the picker (kept colocated, like the reskin pattern) ─

function DatePickerStyles() {
  return (
    <style>{`
      .dp-cal-grid { display: grid; grid-template-columns: repeat(7, minmax(0,1fr)); gap: 2px; }
      .dp-cal-cell {
        display: flex; align-items: center; justify-content: center;
        font-variant-numeric: tabular-nums;
        border-radius: 8px;
        transition: background .12s, color .12s;
        background: transparent; color: var(--color-ink);
      }
      .dp-cal-cell:hover:not([data-disabled]):not([data-out]) { background: var(--color-paper-2); }
      .dp-cal-cell[data-out] { color: rgba(120,113,108,0.35); }
      .dp-cal-cell[data-today] { box-shadow: inset 0 0 0 1.5px var(--color-ink-2); }
      .dp-cal-cell[data-today][data-selected] { box-shadow: inset 0 0 0 1.5px transparent; }
      .dp-cal-cell[data-selected] { background: var(--color-ink); color: var(--color-paper); font-weight: 600; }
      .dp-cal-cell[data-selected]:hover { background: var(--color-ink); }
      .dp-cal-cell[data-in-range] { background: var(--color-paper-2); border-radius: 0; }
      .dp-cal-cell[data-range-start] { border-top-left-radius: 8px; border-bottom-left-radius: 8px; }
      .dp-cal-cell[data-range-end] { border-top-right-radius: 8px; border-bottom-right-radius: 8px; }
      .dp-cal-cell[data-focused]:not([data-selected]) { box-shadow: inset 0 0 0 2px #c96442; }
      .dp-cal-cell[data-weekend] { color: var(--color-ink-3); }
      .dp-cal-cell[data-selected][data-weekend] { color: var(--color-paper); }

      .dp-jump-chip {
        font-size: 11px; padding: 4px 9px; border-radius: 999px;
        border: 1px solid var(--color-line); background: white; color: var(--color-ink-2);
        font-weight: 500; transition: background .12s, border-color .12s;
      }
      .dp-jump-chip:hover { background: var(--color-paper-2); border-color: var(--color-ink-3); }
      .dp-jump-chip[aria-pressed="true"] { background: var(--color-ink); color: var(--color-paper); border-color: var(--color-ink); }

      .dp-preset-btn {
        width: 100%; text-align: left; padding: 7px 10px; border-radius: 8px;
        font-size: 12.5px; color: var(--color-ink-2); font-weight: 500;
        transition: background .12s;
      }
      .dp-preset-btn:hover { background: var(--color-paper-2); }
      .dp-preset-btn[aria-pressed="true"] { background: var(--color-paper-2); color: var(--color-ink); font-weight: 600; }

      .dp-sec-title {
        font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase;
        font-weight: 700; color: var(--color-ink-3);
      }

      .dp-kbd {
        display: inline-flex; align-items: center; justify-content: center;
        min-width: 22px; height: 22px; padding: 0 5px;
        border: 1px solid var(--color-line); border-bottom-width: 2px;
        border-radius: 4px; background: white;
        font-family: var(--font-mono); font-size: 11px; color: var(--color-ink-2);
      }
    `}</style>
  );
}

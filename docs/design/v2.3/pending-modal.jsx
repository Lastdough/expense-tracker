// ─────────────────────────────────────────────────────────────────────────
// v2.2 · Pending transition modal
//
// When the user moves Unpaid → Pending, the state machine needs:
//   • paidAt    — already covered by Mark-as-Paid (v2.1's modal)
//   • a note    — "submitted to finance, awaiting approval"
//   • a date    — when did you submit? (defaults to today)
//
// This file ships three views:
//   <PendingModal>      — the actual capture modal (centered, scrim behind)
//   <PendingDrawerStrip>— the strip in the slide-over that triggers it
//   <PendingHistory>    — what the timeline looks like AFTER the note is saved
// ─────────────────────────────────────────────────────────────────────────

const { useState: useStatePM } = React;

// Curated stock notes the user can pick from instead of typing.
// "Last 3 used" come back here first in the real app.
const STOCK_NOTES = [
  'Submitted to finance — awaiting approval',
  'Receipt attached, waiting on Adi',
  'Posted to Spendesk, batch 24',
  'In the May expense report',
];

function PendingModal({
  variant = 'desktop',        // 'desktop' | 'mobile-sheet'
  open = true,
  expense,
  defaultDate = '2026-05-11',
  defaultNote = '',
  showHeader = true,
}) {
  const [note, setNote] = useStatePM(defaultNote || STOCK_NOTES[0]);
  const [date, setDate] = useStatePM(defaultDate);

  const cat = window.getCat(expense?.catId || 'c4');
  const meth = window.getMeth(expense?.methId || 'm6');
  const from = window.getStatus('s2');
  const to = window.getStatus('s5');

  const body = (
    <>
      {/* Transition strip — visualizes the state move */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px',
        background: 'var(--color-paper)',
        border: '1px solid var(--color-line)',
        borderRadius: 12,
      }}>
        <window.Chip token={from} size="sm">{from.short}</window.Chip>
        <Arrow />
        <window.Chip token={to} size="sm">{to.short}</window.Chip>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-ink-3)' }}>
          state transition
        </div>
      </div>

      {/* Expense summary */}
      <div style={{
        marginTop: 12, padding: '10px 12px',
        border: '1px solid var(--color-line)', borderRadius: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-ink)' }}>
              {expense?.desc || 'Stationery — sticky notes + pens'}
            </div>
            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <window.Chip token={cat} size="sm" />
              <window.Chip token={meth} size="sm" />
              <span style={{ fontSize: 11, color: 'var(--color-ink-3)', fontFamily: 'var(--font-mono)' }}>
                {window.fmtDay(expense?.date || '2026-05-05')}
              </span>
            </div>
          </div>
          <div className="num" style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>
            {window.fmtIDR(expense?.amount || 192500)}
          </div>
        </div>
      </div>

      {/* Note (REQUIRED) */}
      <div style={{ marginTop: 14 }}>
        <FieldLabel required>Submission note</FieldLabel>
        <div style={{ fontSize: 11, color: 'var(--color-ink-3)', marginTop: 1 }}>
          Where did this go, and who's holding it? You'll thank yourself when you read the history three weeks from now.
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. submitted to finance — awaiting approval"
          rows={2}
          style={{
            display: 'block', width: '100%', marginTop: 6, padding: '8px 10px',
            border: '1px solid var(--color-line)', borderRadius: 10,
            fontSize: 13, fontFamily: 'var(--font-sans)', color: 'var(--color-ink)',
            background: 'white', resize: 'vertical',
            outline: '3px solid rgba(10,9,8,0.06)',
          }}
        />
        {/* Suggestion chips */}
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-ink-3)', fontWeight: 600, alignSelf: 'center' }}>
            Recent
          </span>
          {STOCK_NOTES.map(s => (
            <button
              key={s}
              onClick={() => setNote(s)}
              style={{
                fontSize: 11, padding: '4px 9px', borderRadius: 999,
                border: '1px solid var(--color-line)', background: note === s ? 'var(--color-ink)' : 'white',
                color: note === s ? 'var(--color-paper)' : 'var(--color-ink-2)', fontWeight: 500,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Submitted on (date) */}
      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <FieldLabel>Submitted on</FieldLabel>
          <DatePillStub label="Today · 11 May" />
        </div>
        <div>
          <FieldLabel optional>Expected back by</FieldLabel>
          <DatePillStub label="In ~14 days · 25 May" muted />
        </div>
      </div>

      {/* Footer note about reversibility */}
      <div style={{
        marginTop: 14, fontSize: 11, color: 'var(--color-ink-3)', lineHeight: 1.5,
        display: 'flex', gap: 6, alignItems: 'flex-start',
      }}>
        <Icon name="info" size={13} />
        <span>You can move this back to <b style={{ color: 'var(--color-ink-2)' }}>Unpaid</b> or forward to <b style={{ color: 'var(--color-ink-2)' }}>Paid</b> later. The note stays in the history regardless.</span>
      </div>
    </>
  );

  if (variant === 'mobile-sheet') {
    return body;
  }

  // ── Desktop modal shell ──
  return (
    <div style={{ position: 'relative', width: 440, borderRadius: 18, overflow: 'hidden' }} className="artboard">
      {showHeader && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px 10px',
        }}>
          <div>
            <div className="sec-title">State transition</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>Mark as Pending</div>
          </div>
          <button style={{ width: 26, height: 26, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-ink-3)' }}>
            <Icon name="x" />
          </button>
        </div>
      )}
      <div style={{ padding: '4px 18px 14px' }}>{body}</div>
      <div style={{ display: 'flex', gap: 8, padding: '10px 18px', borderTop: '1px solid var(--color-line)', background: 'var(--color-paper)' }}>
        <button style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: '1px solid var(--color-line)', background: 'white', fontSize: 12.5, fontWeight: 600, color: 'var(--color-ink-2)' }}>
          Cancel
        </button>
        <button style={{ flex: 2, padding: '9px 0', borderRadius: 10, background: 'var(--color-ink)', color: 'var(--color-paper)', fontSize: 12.5, fontWeight: 700 }}>
          Mark as Pending
        </button>
      </div>
    </div>
  );
}

// ── Sub-bits ────────────────────────────────────────────────────────────
function FieldLabel({ children, required, optional }) {
  return (
    <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-ink-2)', display: 'inline-flex', gap: 6, alignItems: 'baseline' }}>
      {children}
      {required && <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>·</span>}
      {optional && <span style={{ color: 'var(--color-ink-3)', fontSize: 10, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>}
    </label>
  );
}

function DatePillStub({ label, muted }) {
  return (
    <button style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      width: '100%', padding: '8px 10px', borderRadius: 10,
      border: '1px solid var(--color-line)', background: 'white',
      fontSize: 12.5, color: muted ? 'var(--color-ink-3)' : 'var(--color-ink)', fontWeight: 500,
      marginTop: 6,
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
        <Icon name="cal" size={13} />
        {label}
      </span>
      <Icon name="chev-down" size={13} />
    </button>
  );
}

function Arrow() {
  return (
    <svg width="22" height="14" viewBox="0 0 24 14" fill="none" stroke="var(--color-ink-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h17m-4-4 4 4-4 4" />
    </svg>
  );
}

function Icon({ name, size = 14 }) {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'x': return (<svg {...props}><path d="M18 6 6 18M6 6l12 12" /></svg>);
    case 'cal': return (<svg {...props}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>);
    case 'chev-down': return (<svg {...props}><path d="m6 9 6 6 6-6" /></svg>);
    case 'info': return (<svg {...props}><circle cx="12" cy="12" r="9" /><path d="M12 8v0M12 11v5" /></svg>);
    default: return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// PendingDrawerStrip — the row of buttons inside the Expense Detail
// slide-over that surfaces the legal transitions. Highlights how the
// Pending button opens the modal we designed above.
// ─────────────────────────────────────────────────────────────────────────
function PendingDrawerStrip({ activeTrigger }) {
  return (
    <div style={{ padding: 14, border: '1px solid var(--color-line)', borderRadius: 14, background: 'white' }}>
      <div className="sec-title" style={{ marginBottom: 8 }}>Reimbursement · slide-over footer</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: 'var(--color-ink-3)' }}>Currently</span>
        <window.Chip token={window.getStatus('s2')} size="sm">Unpaid</window.Chip>
        <span style={{ fontSize: 11, color: 'var(--color-ink-3)' }}>· legal next states:</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <TransitionBtn label="Mark as Paid"    status="s3" />
        <TransitionBtn label="Mark as Early"   status="s4" />
        <TransitionBtn label="Mark as Pending" status="s5" active={activeTrigger === 'pending'} />
        <TransitionBtn label="Mark as Non-Reimb." status="s1" />
      </div>

      <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--color-ink-3)', lineHeight: 1.55 }}>
        Illegal transitions (e.g. Paid → Pending) are <b style={{ color: 'var(--color-ink-2)' }}>hidden, not greyed</b>.
        Pending requires a note → opens the modal. Paid / Early require a date → use the v2.1 date picker inline.
      </div>
    </div>
  );
}

function TransitionBtn({ label, status, active }) {
  const tok = window.getStatus(status);
  return (
    <button style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: '6px 11px', borderRadius: 999,
      border: active ? '1.5px solid var(--color-ink)' : '1px solid var(--color-line)',
      background: active ? 'var(--color-paper-2)' : 'white',
      fontSize: 12, fontWeight: 600, color: 'var(--color-ink-2)',
    }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: tok.bg, border: '1px solid ' + tok.fg }} />
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// PendingHistory — the audit trail entry the note creates
// ─────────────────────────────────────────────────────────────────────────
function PendingHistory({ note = STOCK_NOTES[0], when = '11 May · 14:08' }) {
  return (
    <div style={{ padding: 18, border: '1px solid var(--color-line)', borderRadius: 14, background: 'white' }}>
      <div className="sec-title" style={{ marginBottom: 12 }}>History · what the note becomes</div>

      <div className="tl-rail">
        <TimelineItem
          color="active"
          when="11 May · 09:42"
          status="s2"
          title="Recorded"
          desc={<>Created as <b>Unpaid Reimbursable</b> via Quick-Add</>}
        />
        <TimelineItem
          color="pending"
          when={when}
          status="s5"
          title="Marked Pending"
          desc={<>Transitioned by <b>you</b> · submission noted →</>}
          extra={
            <div className="note-card" style={{ marginTop: 6 }}>
              <div className="lbl">Submission note</div>
              {note}
            </div>
          }
        />
        <TimelineItem
          color="future"
          when="awaiting"
          status="s3"
          title="Marked Paid"
          desc={<span style={{ color: 'var(--color-ink-3)' }}>Will resolve when finance confirms.</span>}
        />
      </div>
    </div>
  );
}

function TimelineItem({ color, when, status, title, desc, extra }) {
  const tok = window.getStatus(status);
  return (
    <div className="tl-item">
      <span className={'tl-node ' + (color || '')} />
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: color === 'future' ? 'var(--color-ink-3)' : 'var(--color-ink)' }}>
          {title}
        </div>
        <div style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--color-ink-3)', letterSpacing: '0.04em' }}>
          {when}
        </div>
      </div>
      <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
        <window.Chip token={tok} size="sm">{tok.short}</window.Chip>
        <span style={{ fontSize: 12, color: 'var(--color-ink-2)', lineHeight: 1.5 }}>{desc}</span>
      </div>
      {extra}
    </div>
  );
}

Object.assign(window, {
  PendingModal, PendingDrawerStrip, PendingHistory, STOCK_NOTES,
});

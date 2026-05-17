// Shared wireframe primitives — color tokens, frame shells, chip components,
// sketchy annotation text. Everything is exported to window so the per-screen
// files can use them.

const INK = '#1a1612';
const INK_SOFT = '#5a5450';
const PAPER = '#fbf8f1';
const PAPER_2 = '#f3eee2';
const ACCENT = '#c8412b'; // marker red, used very sparingly for annotations

// ─── Reference data, exact colors from CLAUDE.md ──────────────────────────
const CATEGORIES = [
  { name: 'Food', bg: '#ffcfc9', fg: '#b10202' },
  { name: 'Transportations', bg: '#0a53a8', fg: '#ffffff' },
  { name: 'Shopping', bg: '#e6cff2', fg: '#5a3286' },
  { name: 'Supplies', bg: '#e6cff2', fg: '#5a3286' },
  { name: 'Groceries', bg: '#e6cff2', fg: '#5a3286' },
  { name: 'Bill', bg: '#ffe5a0', fg: '#473821' },
  { name: 'Services', bg: '#ffe5a0', fg: '#473821' },
  { name: 'Entertainment', bg: '#ffe5a0', fg: '#473821' },
  { name: 'Healthcare', bg: '#d4edbc', fg: '#11734b' },
  { name: 'Misc', bg: '#e8eaed', fg: '#000000' },
];
const METHODS = [
  { name: 'Mandiri', bg: '#143361', fg: '#a8c0e0' },
  { name: 'Jago', bg: '#fcaf23', fg: '#6b4400' },
  { name: 'BCA', bg: '#046ebc', fg: '#c0d8f5' },
  { name: 'Gopay', bg: '#00accb', fg: '#e0f7ff' },
  { name: 'ShopeePay', bg: '#ef5334', fg: '#ffffff' },
  { name: 'Cash', bg: '#e8eaed', fg: '#000000' },
];
const STATUSES = [
  { name: 'Non-Reimbursable', short: 'Non', bg: '#e8eaed', fg: '#000000' },
  { name: 'Unpaid Reimbursable', short: 'Unpaid', bg: '#ffe5a0', fg: '#473821' },
  { name: 'Paid Reimbursable', short: 'Paid', bg: '#d4edbc', fg: '#11734b' },
  { name: 'Early Reimbursement', short: 'Early', bg: '#bce3f2', fg: '#0b4c6b' },
  { name: 'Pending Reimbursement', short: 'Pending', bg: '#ffc8aa', fg: '#753800' },
];

const byName = (list, name) => list.find(x => x.name === name) || list[0];

// ─── Formatting helpers ───────────────────────────────────────────────────
const fmtIDR = (n) => 'Rp ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const fmtIDRshort = (n) => {
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + ' jt';
  if (n >= 1_000) return 'Rp ' + Math.round(n / 1_000) + 'rb';
  return 'Rp ' + n;
};

// ─── Chip / Pill ──────────────────────────────────────────────────────────
function Chip({ token, label, size = 'sm', style }) {
  const t = token || { bg: '#e8eaed', fg: '#000' };
  const pad = size === 'lg' ? '5px 11px' : size === 'md' ? '3px 9px' : '2px 7px';
  const fz = size === 'lg' ? 13 : size === 'md' ? 12 : 11;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: t.bg, color: t.fg,
      borderRadius: 999, padding: pad, fontSize: fz, fontWeight: 500,
      letterSpacing: 0.1, whiteSpace: 'nowrap', lineHeight: 1.2,
      ...style,
    }}>
      {label ?? t.name}
    </span>
  );
}

// ─── Sketchy primitives ───────────────────────────────────────────────────
function Box({ children, style, dashed, soft, ...rest }) {
  return (
    <div {...rest} style={{
      border: `${dashed ? '1.5px dashed' : '1.75px solid'} ${soft ? INK_SOFT : INK}`,
      borderRadius: 6,
      background: PAPER,
      ...style,
    }}>{children}</div>
  );
}

// Sketchy "input field" placeholder
function FieldStub({ label, value, hint, style, dashed }) {
  return (
    <div style={{ ...style }}>
      {label && <div style={{ fontFamily: 'Caveat, cursive', fontSize: 15, color: INK_SOFT, marginBottom: 2 }}>{label}</div>}
      <div style={{
        border: `${dashed ? '1.5px dashed' : '1.75px solid'} ${INK}`,
        borderRadius: 6,
        padding: '8px 11px',
        minHeight: 36,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#fff',
        fontSize: 14, color: value ? INK : INK_SOFT,
      }}>
        <span>{value || hint || '…'}</span>
      </div>
    </div>
  );
}

// Sketchy button
function Btn({ children, primary, small, style, onClick }) {
  return (
    <button onClick={onClick} style={{
      border: `1.75px solid ${INK}`,
      background: primary ? INK : PAPER,
      color: primary ? PAPER : INK,
      borderRadius: 6,
      padding: small ? '5px 11px' : '8px 16px',
      fontFamily: 'inherit',
      fontSize: small ? 12 : 13,
      fontWeight: 600,
      letterSpacing: 0.2,
      cursor: 'pointer',
      boxShadow: primary ? 'none' : '2px 2px 0 ' + INK,
      ...style,
    }}>{children}</button>
  );
}

// Handwritten annotation (caveat). For arrows: use `arrow="left"|"right"|"up"|"down"`.
function Anno({ children, arrow, style, color = ACCENT }) {
  const arr = arrow === 'left' ? '← ' : arrow === 'up' ? '↑ ' : '';
  const arrEnd = arrow === 'right' ? ' →' : arrow === 'down' ? ' ↓' : '';
  return (
    <span style={{
      fontFamily: 'Caveat, cursive', color, fontSize: 16, lineHeight: 1.1,
      ...style,
    }}>{arr}{children}{arrEnd}</span>
  );
}

// Scribbled separator line
function Scribble({ w = '100%', style }) {
  return <svg width={w} height={6} viewBox="0 0 200 6" preserveAspectRatio="none" style={{ display: 'block', ...style }}>
    <path d="M0 3 Q 25 0 50 3 T 100 3 T 150 3 T 200 3" stroke={INK} strokeWidth={1.25} fill="none" strokeLinecap="round" />
  </svg>;
}

// Tiny placeholder text block (for body copy)
function TextStub({ lines = 1, width = 1, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{
          height: 8, background: '#e0d9c8', borderRadius: 4,
          width: `${(i === lines - 1 ? width * 0.7 : width) * 100}%`,
        }} />
      ))}
    </div>
  );
}

// ─── Frames: mobile phone shell, desktop window shell ─────────────────────
function PhoneFrame({ children, width = 340, height = 720, label, style }) {
  return (
    <div style={{
      width, height, background: PAPER,
      border: `2px solid ${INK}`,
      borderRadius: 32, padding: 10,
      boxShadow: '4px 4px 0 ' + INK,
      position: 'relative',
      ...style,
    }}>
      {/* notch */}
      <div style={{
        position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
        width: 64, height: 6, background: INK, borderRadius: 999, zIndex: 3,
      }} />
      <div style={{
        width: '100%', height: '100%', borderRadius: 24,
        border: `1.5px solid ${INK}`, overflow: 'hidden',
        display: 'flex', flexDirection: 'column', background: '#fff',
      }}>
        {/* status bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 20px 4px', fontSize: 11, fontWeight: 600, color: INK,
          flexShrink: 0,
        }}>
          <span>9:41</span>
          <span style={{ display: 'inline-flex', gap: 5, fontSize: 10 }}>
            <span>●●●●</span><span>5G</span><span>▮▮▮</span>
          </span>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {children}
        </div>
      </div>
      {label && <div style={{
        position: 'absolute', top: -28, left: 8,
        fontFamily: 'Caveat, cursive', fontSize: 18, color: INK,
      }}>{label}</div>}
    </div>
  );
}

function DesktopFrame({ children, width = 1180, height = 760, label, style }) {
  return (
    <div style={{
      width, height, background: PAPER,
      border: `2px solid ${INK}`, borderRadius: 10,
      boxShadow: '4px 4px 0 ' + INK,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      ...style,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 12px', borderBottom: `1.5px solid ${INK}`,
        background: PAPER_2, flexShrink: 0,
      }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, border: `1.25px solid ${INK}` }} />
        <span style={{ width: 10, height: 10, borderRadius: 999, border: `1.25px solid ${INK}` }} />
        <span style={{ width: 10, height: 10, borderRadius: 999, border: `1.25px solid ${INK}` }} />
        <div style={{
          marginLeft: 14, fontSize: 12, color: INK_SOFT, letterSpacing: 0.3,
        }}>ledger.local  ·  Expense Tracker</div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', background: '#fff' }}>
        {children}
      </div>
    </div>
  );
}

// Mini "Net owed" card used across screens
function NetOwedMini({ amount = 487500, style }) {
  return (
    <div style={{
      border: `1.5px dashed ${INK}`, borderRadius: 8,
      padding: '10px 14px',
      ...style,
    }}>
      <div style={{ fontFamily: 'Caveat, cursive', fontSize: 14, color: INK_SOFT }}>net owed to you</div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>{fmtIDR(amount)}</div>
      <div style={{ fontSize: 11, color: INK_SOFT, marginTop: 2 }}>
        Early {fmtIDR(680000)} − Unpaid {fmtIDR(192500)}
      </div>
    </div>
  );
}

// Sample data used by list/dashboard/detail
const SAMPLE_EXPENSES = [
  { id: 1, date: '2026-05-11', desc: 'Nasi padang lunch', amount: 42000, raw: null, cat: 'Food', method: 'Gopay', status: 'Non-Reimbursable' },
  { id: 2, date: '2026-05-11', desc: 'Grab to office (team)', amount: 78000, raw: '=26000*3', cat: 'Transportations', method: 'Gopay', status: 'Unpaid Reimbursable' },
  { id: 3, date: '2026-05-10', desc: 'Indomaret — household', amount: 134500, raw: null, cat: 'Groceries', method: 'BCA', status: 'Non-Reimbursable' },
  { id: 4, date: '2026-05-10', desc: 'Electric bill May', amount: 412000, raw: null, cat: 'Bill', method: 'Mandiri', status: 'Non-Reimbursable' },
  { id: 5, date: '2026-05-09', desc: 'Conference ticket (client paid)', amount: 850000, raw: null, cat: 'Services', method: 'BCA', status: 'Early Reimbursement' },
  { id: 6, date: '2026-05-09', desc: 'Coffee w/ Rina', amount: 58000, raw: null, cat: 'Food', method: 'Cash', status: 'Non-Reimbursable' },
  { id: 7, date: '2026-05-08', desc: 'Apotek — vitamins', amount: 95000, raw: null, cat: 'Healthcare', method: 'ShopeePay', status: 'Non-Reimbursable' },
  { id: 8, date: '2026-05-08', desc: 'Stationery for team', amount: 192500, raw: '=38500*5', cat: 'Supplies', method: 'BCA', status: 'Pending Reimbursement' },
  { id: 9, date: '2026-05-07', desc: 'Netflix', amount: 65000, raw: null, cat: 'Entertainment', method: 'Jago', status: 'Non-Reimbursable' },
];

Object.assign(window, {
  INK, INK_SOFT, PAPER, PAPER_2, ACCENT,
  CATEGORIES, METHODS, STATUSES, byName,
  fmtIDR, fmtIDRshort,
  Chip, Box, FieldStub, Btn, Anno, Scribble, TextStub,
  PhoneFrame, DesktopFrame, NetOwedMini,
  SAMPLE_EXPENSES,
});

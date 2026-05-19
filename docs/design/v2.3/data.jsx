// ─────────────────────────────────────────────────────────────────────────
// v2.2 · shared sample data and helpers
// Pulls the chip palette + sample expenses from v2.0's seed tables so the
// receipt / timeline mocks look the same as the rest of the design.
// ─────────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'c1',  name: 'Food',             bg: '#ffcfc9', fg: '#b10202' },
  { id: 'c2',  name: 'Transportations',  bg: '#0a53a8', fg: '#ffffff' },
  { id: 'c3',  name: 'Shopping',         bg: '#e6cff2', fg: '#5a3286' },
  { id: 'c4',  name: 'Supplies',         bg: '#e6cff2', fg: '#5a3286' },
  { id: 'c5',  name: 'Groceries',        bg: '#e6cff2', fg: '#5a3286' },
  { id: 'c6',  name: 'Bill',             bg: '#ffe5a0', fg: '#473821' },
  { id: 'c7',  name: 'Services',         bg: '#ffe5a0', fg: '#473821' },
  { id: 'c8',  name: 'Entertainment',    bg: '#ffe5a0', fg: '#473821' },
  { id: 'c9',  name: 'Healthcare',       bg: '#d4edbc', fg: '#11734b' },
  { id: 'c10', name: 'Misc',             bg: '#e8eaed', fg: '#000000' },
];

const METHODS = [
  { id: 'm1', name: 'Mandiri',   bg: '#143361', fg: '#a8c0e0' },
  { id: 'm2', name: 'Jago',      bg: '#fcaf23', fg: '#6b4400' },
  { id: 'm3', name: 'BCA',       bg: '#046ebc', fg: '#c0d8f5' },
  { id: 'm4', name: 'Gopay',     bg: '#00accb', fg: '#e0f7ff' },
  { id: 'm5', name: 'ShopeePay', bg: '#ef5334', fg: '#ffffff' },
  { id: 'm6', name: 'Cash',      bg: '#e8eaed', fg: '#000000' },
];

const STATUSES = [
  { id: 's1', name: 'Non-Reimbursable',      short: 'Non-Reimb.', bg: '#e8eaed', fg: '#000000' },
  { id: 's2', name: 'Unpaid Reimbursable',   short: 'Unpaid',     bg: '#ffe5a0', fg: '#473821' },
  { id: 's3', name: 'Paid Reimbursable',     short: 'Paid',       bg: '#d4edbc', fg: '#11734b' },
  { id: 's4', name: 'Early Reimbursement',   short: 'Early',      bg: '#bce3f2', fg: '#0b4c6b' },
  { id: 's5', name: 'Pending Reimbursement', short: 'Pending',    bg: '#ffc8aa', fg: '#753800' },
];

const byId = (arr, id) => arr.find(x => x.id === id);
const getCat = (id) => byId(CATEGORIES, id) || CATEGORIES[9];
const getMeth = (id) => byId(METHODS, id) || METHODS[5];
const getStatus = (id) => byId(STATUSES, id) || STATUSES[0];

// ─── Sample expenses (period 1–11 May 2026) ───────────────────────────────
// Mix of statuses so the receipt has Unpaid + Pending + Early sections.
// Two are explicitly large so we can see the page-break behavior in print.
const EXPENSES = [
  { id: 'e1',  date: '2026-05-02', desc: 'Grab to office (team onboarding)', amount: 78000,  catId: 'c2', methId: 'm4', statusId: 's2' },
  { id: 'e2',  date: '2026-05-03', desc: 'Grab to office (team onboarding)', amount: 78000,  catId: 'c2', methId: 'm4', statusId: 's2' },
  { id: 'e3',  date: '2026-05-04', desc: 'Lunch — onboarding lunch w/ Adi',  amount: 187000, catId: 'c1', methId: 'm1', statusId: 's2' },
  { id: 'e4',  date: '2026-05-05', desc: 'Grab to office (team onboarding)', amount: 78000,  catId: 'c2', methId: 'm4', statusId: 's2' },
  { id: 'e5',  date: '2026-05-05', desc: 'Stationery — sticky notes + pens', amount: 192500, catId: 'c4', methId: 'm6', statusId: 's5' },
  { id: 'e6',  date: '2026-05-06', desc: 'Grab to office (team onboarding)', amount: 78000,  catId: 'c2', methId: 'm4', statusId: 's2' },
  { id: 'e7',  date: '2026-05-06', desc: 'Conference ticket reimbursed early', amount: 850000, catId: 'c8', methId: 'm1', statusId: 's4' },
  { id: 'e8',  date: '2026-05-07', desc: 'Coffee for the offsite',           amount: 145000, catId: 'c1', methId: 'm2', statusId: 's2' },
  { id: 'e9',  date: '2026-05-08', desc: 'Cab — client visit (BCA tower)',   amount: 96000,  catId: 'c2', methId: 'm3', statusId: 's2' },
  { id: 'e10', date: '2026-05-09', desc: 'Stationery — printing run',        amount: 64000,  catId: 'c4', methId: 'm6', statusId: 's5' },
  { id: 'e11', date: '2026-05-10', desc: 'Lunch — onboarding lunch w/ Tia',  amount: 162000, catId: 'c1', methId: 'm1', statusId: 's2' },
  { id: 'e12', date: '2026-05-11', desc: 'Internet bill — May',              amount: 425000, catId: 'c6', methId: 'm1', statusId: 's5' },
];

// ─── Money + date formatting ──────────────────────────────────────────────
function fmtIDR(n, opts = {}) {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(Math.round(n));
  const grouped = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (opts.bare ? '' : 'Rp ') + sign + grouped;
}
function fmtDay(d) {
  const dt = typeof d === 'string' ? new Date(d) : d;
  const day = String(dt.getDate()).padStart(2, '0');
  const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][dt.getMonth()];
  return `${day} ${m}`;
}
function fmtDayLong(d) {
  const dt = typeof d === 'string' ? new Date(d) : d;
  const day = String(dt.getDate()).padStart(2, '0');
  const m = ['January','February','March','April','May','June','July','August','September','October','November','December'][dt.getMonth()];
  return `${day} ${m} ${dt.getFullYear()}`;
}

// ─── Chip primitive ───────────────────────────────────────────────────────
function Chip({ token, size = 'md', children }) {
  if (!token) return null;
  const sz = size === 'sm' ? ' chip-sm' : '';
  return (
    <span className={'chip' + sz} style={{ background: token.bg, color: token.fg }}>
      {children || token.short || token.name}
    </span>
  );
}

Object.assign(window, {
  CATEGORIES, METHODS, STATUSES, EXPENSES,
  getCat, getMeth, getStatus,
  fmtIDR, fmtDay, fmtDayLong,
  Chip,
});

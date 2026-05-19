import { describe, expect, it } from 'vitest';
import { Money } from '../../../../shared-kernel/money/Money.js';
import { type Receipt } from '../../domain/value-objects/Receipt.js';
import { renderReceiptCsv } from './receiptCsv.js';
import { renderReceiptHtml } from './receiptHtml.js';

const idr = (n: bigint) => Money.fromMinor(n, 'IDR');

const SAMPLE: Receipt = {
  dateStart: new Date('2026-05-01T00:00:00Z'),
  dateEnd: new Date('2026-06-01T00:00:00Z'),
  currency: 'IDR',
  lines: [
    {
      description: 'Lunch with Bob',
      unpaidTotal: idr(1_000_000n),
      earlyTotal: idr(0n),
      total: idr(1_000_000n),
      unpaidCount: 2,
      earlyCount: 0,
    },
    {
      description: 'Office "supplies", reimbursed',
      unpaidTotal: idr(300_000n),
      earlyTotal: idr(500_000n),
      total: idr(-200_000n),
      unpaidCount: 1,
      earlyCount: 1,
    },
  ],
  grandTotal: idr(800_000n),
};

const EMPTY: Receipt = {
  dateStart: new Date('2026-05-01T00:00:00Z'),
  dateEnd: new Date('2026-06-01T00:00:00Z'),
  currency: null,
  lines: [],
  grandTotal: null,
};

describe('renderReceiptHtml (v2.3 Simple)', () => {
  it('escapes HTML in descriptions to prevent injection', () => {
    const receipt: Receipt = {
      ...SAMPLE,
      lines: [
        {
          description: '<script>alert("xss")</script>',
          unpaidTotal: idr(1n),
          earlyTotal: idr(0n),
          total: idr(1n),
          unpaidCount: 1,
          earlyCount: 0,
        },
      ],
      grandTotal: idr(1n),
    };
    const html = renderReceiptHtml(receipt);
    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&quot;xss&quot;');
  });

  it('renders the empty-range message and no data table', () => {
    const html = renderReceiptHtml(EMPTY);
    expect(html).toContain('No Unpaid or Early reimbursements');
    expect(html).not.toContain('<table class="simple-table">');
  });

  it('shows the Simple letterhead eyebrow + Net Owed block on the printable layout', () => {
    const html = renderReceiptHtml(SAMPLE);
    expect(html).toContain('Expense Receipt · Simple');
    // Month + year derived from dateStart
    expect(html).toContain('Reimbursement — May 2026');
    // Net Owed label + caption keyed on positive grandTotal
    expect(html).toContain('Net owed');
    expect(html).toContain('they owe you');
    // Grand total amount (locale whitespace tolerated)
    expect(html).toMatch(/Rp\s*800\.000/);
  });

  it('renders the Subtotal row with Unpaid and Early column totals', () => {
    const html = renderReceiptHtml(SAMPLE);
    // Unpaid subtotal = 1_000_000 + 300_000 = 1_300_000
    expect(html).toMatch(/Rp\s*1\.300\.000/);
    // Early subtotal = 500_000
    expect(html).toMatch(/Rp\s*500\.000/);
  });

  it('flips the Net Owed color/copy when grandTotal is negative', () => {
    const html = renderReceiptHtml({
      ...SAMPLE,
      lines: [
        {
          description: 'Big early reimb',
          unpaidTotal: idr(0n),
          earlyTotal: idr(500_000n),
          total: idr(-500_000n),
          unpaidCount: 0,
          earlyCount: 1,
        },
      ],
      grandTotal: idr(-500_000n),
    });
    expect(html).toContain('net-owed-neg');
    expect(html).toContain('you owe them');
  });

  it('encodes the v2.3 print rules in the stylesheet', () => {
    const html = renderReceiptHtml(SAMPLE);
    // A4 portrait paged layout
    expect(html).toContain('size: A4 portrait');
    // Repeating column header in print
    expect(html).toContain('display: table-header-group');
    // Page N of M footer via CSS paged-media counters
    expect(html).toContain('counter(page)');
    expect(html).toContain('counter(pages)');
    // Rows + critical blocks avoid page splits
    expect(html).toMatch(/break-inside:\s*avoid/);
  });

  it('routes simple=false to the Complex stub', () => {
    const html = renderReceiptHtml(SAMPLE, { simple: false });
    expect(html).toContain('Complex preview — v2.3 follow-up');
    expect(html).toContain('Amount currently owed to you');
    expect(html).not.toContain('Expense Receipt · Simple');
  });
});

describe('renderReceiptCsv', () => {
  it('emits a header row, one row per line, plus the grand total', () => {
    const csv = renderReceiptCsv(SAMPLE);
    const lines = csv.split('\r\n').filter(Boolean);
    expect(lines).toHaveLength(4); // header + 2 lines + grand total
    expect(lines[0]).toBe(
      'description,unpaidMajor,earlyMajor,netMajor,currency,unpaidCount,earlyCount',
    );
    expect(lines[3]).toBe('GRAND TOTAL,,,800000,IDR,,');
  });

  it('quotes fields containing commas or quotes', () => {
    const csv = renderReceiptCsv(SAMPLE);
    expect(csv).toContain('"Office ""supplies"", reimbursed"');
  });

  it('emits an empty receipt as just the header', () => {
    const csv = renderReceiptCsv(EMPTY);
    expect(csv).toBe(
      'description,unpaidMajor,earlyMajor,netMajor,currency,unpaidCount,earlyCount\r\n',
    );
  });
});

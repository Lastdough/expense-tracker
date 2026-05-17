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

describe('renderReceiptHtml', () => {
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

  it('renders the empty-range message and no table', () => {
    const html = renderReceiptHtml(EMPTY);
    expect(html).toContain('No Unpaid or Early reimbursements');
    expect(html).not.toContain('<table>');
  });

  it('shows the grand total in the printable layout', () => {
    const html = renderReceiptHtml(SAMPLE);
    expect(html).toContain('Amount currently owed to you');
    expect(html).toContain('Rp 800,000');
  });

  it('marks early-only contributions with the negative sign and class', () => {
    const html = renderReceiptHtml(SAMPLE);
    expect(html).toContain('class="num neg">−Rp 500,000');
  });
});

describe('renderReceiptCsv', () => {
  it('emits a header row and one row per line, plus the grand total', () => {
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
    // 'Office "supplies", reimbursed' has both a comma and quotes
    expect(csv).toContain('"Office ""supplies"", reimbursed"');
  });

  it('emits an empty receipt as just the header', () => {
    const csv = renderReceiptCsv(EMPTY);
    expect(csv).toBe(
      'description,unpaidMajor,earlyMajor,netMajor,currency,unpaidCount,earlyCount\r\n',
    );
  });
});

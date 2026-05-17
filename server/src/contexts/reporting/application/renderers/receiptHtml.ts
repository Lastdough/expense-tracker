import { type Receipt } from '../../domain/value-objects/Receipt.js';

const STYLE = `
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; padding: 2rem; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 1.4rem; margin: 0 0 .25rem; }
  .range { color: #555; margin-bottom: 1.5rem; font-size: .9rem; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: .55rem .75rem; border-bottom: 1px solid #e5e5e5; text-align: left; vertical-align: top; }
  th { background: #f7f7f7; font-weight: 600; font-size: .8rem; text-transform: uppercase; letter-spacing: .02em; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  tr.total td { border-top: 2px solid #1a1a1a; border-bottom: none; font-weight: 600; padding-top: .8rem; }
  .empty { color: #777; font-style: italic; padding: 1.5rem 0; }
  .neg { color: #b10202; }
  @media print { body { padding: 1cm; } th { background: transparent; } }
`;

export function renderReceiptHtml(receipt: Receipt): string {
  const title = 'Reimbursement Receipt';
  const rangeLabel = `${receipt.dateStart.toISOString().slice(0, 10)} → ${receipt.dateEnd
    .toISOString()
    .slice(0, 10)}`;
  const body =
    receipt.lines.length === 0
      ? `<p class="empty">No Unpaid or Early reimbursements in this range.</p>`
      : `<table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="num">Unpaid</th>
              <th class="num">Early</th>
              <th class="num">Net Owed</th>
            </tr>
          </thead>
          <tbody>
            ${receipt.lines
              .map(
                (line) => `<tr>
                  <td>${escapeHtml(line.description)}</td>
                  <td class="num">${line.unpaidCount > 0 ? escapeHtml(line.unpaidTotal.format()) : '—'}</td>
                  <td class="num ${line.earlyCount > 0 ? 'neg' : ''}">${line.earlyCount > 0 ? '−' + escapeHtml(line.earlyTotal.format()) : '—'}</td>
                  <td class="num">${escapeHtml(line.total.format())}</td>
                </tr>`,
              )
              .join('\n')}
            <tr class="total">
              <td>Amount currently owed to you</td>
              <td></td>
              <td></td>
              <td class="num">${receipt.grandTotal ? escapeHtml(receipt.grandTotal.format()) : '—'}</td>
            </tr>
          </tbody>
        </table>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>${escapeHtml(title)} — ${escapeHtml(rangeLabel)}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>${STYLE}</style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    <div class="range">${escapeHtml(rangeLabel)}</div>
    ${body}
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

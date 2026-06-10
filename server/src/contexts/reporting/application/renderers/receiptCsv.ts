import {type ExportData, type Receipt} from '../../domain/value-objects/Receipt.js';

/**
 * Renders the receipt as RFC 4180-style CSV. Fields containing commas,
 * quotes, or line breaks are wrapped in quotes with embedded quotes
 * doubled. Money values are emitted as major-unit decimal strings without
 * a thousand separators, so spreadsheet apps treat them as numbers.
 */
export function renderReceiptCsv(receipt: Receipt): string {
  const lines: string[] = [];
  lines.push(
    csvRow([
      'description',
      'unpaidMajor',
      'earlyMajor',
      'netMajor',
      'currency',
      'unpaidCount',
      'earlyCount',
    ]),
  );
  for (const line of receipt.lines) {
    lines.push(
      csvRow([
        line.description,
        line.unpaidTotal.toMajor(),
        line.earlyTotal.toMajor(),
        line.total.toMajor(),
        line.total.currency,
        String(line.unpaidCount),
        String(line.earlyCount),
      ]),
    );
  }
  if (receipt.grandTotal) {
    lines.push(
      csvRow([
        'GRAND TOTAL',
        '',
        '',
        receipt.grandTotal.toMajor(),
        receipt.grandTotal.currency,
        '',
        '',
      ]),
    );
  }
  return lines.join('\r\n') + '\r\n';
}
export function renderExportAllDataCsv(exportData: ExportData): string {
  const lines: string[] = [];

  lines.push(
    csvRow([
      'transactionDate',
      'formula',
      'out',
      'description',
      'category',
      'method',
      'reimbursementStatus',
      'currency',
    ]),
  );

  for (const line of exportData.lines) {
    lines.push(
      csvRow([
        line.transactionDate.toISOString(),
        line.formula,
        line.out.toMajor(),
        line.description,
        line.category,
        line.method,
        line.reimbursementStatus,
        line.total.currency,
      ]),
    );
  }

  return lines.join('\r\n') + '\r\n';
}


function csvRow(fields: readonly string[]): string {
  return fields.map(csvField).join(',');
}

function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

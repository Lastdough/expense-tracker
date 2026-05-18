import { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react';

import { ApiError } from '../api/http';
import {
  importApi,
  type ImportReport,
  type ImportRowReport,
} from '../api/import';
import { Toast, type ToastState } from '../components/Toast';

const REQUIRED_COLUMNS = [
  'Transaction Date',
  'Out (Rp.)',
  'Description',
  'Category',
  'Method',
  'Reimbursement',
];

export default function ImportPage() {
  const [csvText, setCsvText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [defaultYear, setDefaultYear] = useState<number>(new Date().getFullYear());
  const [report, setReport] = useState<ImportReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastId = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (kind: ToastState['kind'], message: string) => {
    toastId.current += 1;
    setToast({ id: toastId.current, kind, message });
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    setFileName(file.name);
    setReport(null);
    setErrorBanner(null);
  };

  const reset = () => {
    setCsvText(null);
    setFileName(null);
    setReport(null);
    setErrorBanner(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const run = async (dryRun: boolean) => {
    if (csvText === null) return;
    setLoading(true);
    setErrorBanner(null);
    try {
      const result = await importApi.run({ csvText, defaultYear, dryRun });
      setReport(result);
      if (!dryRun) {
        if (result.committed) {
          showToast('success', `Imported ${result.validRows} expenses.`);
        } else {
          showToast('error', 'Some rows failed — nothing was imported.');
        }
      }
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.code === 'missing_sheets_column'
            ? e.message
            : e.code === 'malformed_csv'
              ? `Malformed CSV: ${e.message}`
              : e.message
          : e instanceof Error
            ? e.message
            : 'Import failed';
      setErrorBanner(msg);
    } finally {
      setLoading(false);
    }
  };

  const downloadFailedRows = () => {
    if (!report) return;
    const failed = report.rows.filter((r) => r.status === 'error');
    if (failed.length === 0) return;
    const csv = serializeFailedRows(failed);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import-failed-rows.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const canCommit = report !== null && report.invalidRows === 0 && report.totalRows > 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <header className="px-5 md:px-8 pt-6 pb-5 border-b border-line shrink-0">
        <div className="text-[11.5px] uppercase tracking-wider text-ink-3 font-semibold">
          Migration
        </div>
        <h1 className="text-[22px] md:text-[28px] font-bold tracking-tight mt-0.5">
          Sheets import
        </h1>
        <p className="mt-2 text-[12.5px] text-ink-3 max-w-2xl leading-relaxed">
          Upload your Google Sheets CSV export. Every row is validated first;
          nothing is written to the database until you confirm. All-or-nothing —
          if any row fails validation, the whole batch is rejected so you can
          fix the source and retry.
        </p>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto bg-paper">
        <div className="max-w-4xl mx-auto px-5 md:px-8 py-6 flex flex-col gap-5">
          <section className="rounded-xl border border-line bg-white p-5">
            <h2 className="text-[13px] font-semibold tracking-tight">1 · Pick a CSV file</h2>
            <p className="mt-1 text-[11.5px] text-ink-3 leading-relaxed">
              Required columns: {REQUIRED_COLUMNS.join(' · ')}. Dates are read
              as <span className="font-mono">D Mmm</span> in Bahasa
              (e.g. <span className="font-mono">23 Apr</span>,{' '}
              <span className="font-mono">6 Mei</span>). The year below fills
              in any row that doesn&apos;t spell one out.
            </p>
            <div className="mt-4 flex flex-col md:flex-row md:items-end gap-3">
              <label className="flex-1 flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-line bg-paper-2 hover:border-ink-3 cursor-pointer transition">
                <Upload size={16} className="text-ink-2 shrink-0" aria-hidden />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={onFileChange}
                  className="hidden"
                />
                <span className="text-[12.5px] text-ink-2 truncate">
                  {fileName ?? 'Click to choose a .csv file'}
                </span>
              </label>
              <div className="flex items-end gap-2">
                <label className="flex flex-col">
                  <span className="text-[10.5px] uppercase tracking-wider text-ink-3 font-semibold">
                    Default year
                  </span>
                  <input
                    type="number"
                    min={1900}
                    max={9999}
                    value={defaultYear}
                    onChange={(e) => setDefaultYear(Number(e.target.value))}
                    className="mt-1 w-[110px] px-3 py-2 rounded-lg border border-line bg-white text-[13px] font-mono focus:border-ink-2 focus:outline-none"
                  />
                </label>
                {fileName !== null && (
                  <button
                    type="button"
                    onClick={reset}
                    className="px-3 py-2 rounded-lg border border-line text-[12px] font-medium text-ink-3 hover:text-ink-2 hover:border-ink-3"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-line bg-white p-5">
            <h2 className="text-[13px] font-semibold tracking-tight">2 · Validate</h2>
            <p className="mt-1 text-[11.5px] text-ink-3 leading-relaxed">
              Runs the parser and reference-data lookup against every row
              without persisting anything. Fix any flagged rows in the source
              CSV before importing.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => run(true)}
                disabled={csvText === null || loading}
                className="px-4 py-2 rounded-lg bg-ink text-paper text-[12.5px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                Validate (dry run)
              </button>
              <button
                type="button"
                onClick={() => run(false)}
                disabled={!canCommit || loading}
                className="px-4 py-2 rounded-lg border border-ink text-ink text-[12.5px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                <Upload size={14} />
                Import all
              </button>
              {report !== null && report.invalidRows > 0 && (
                <button
                  type="button"
                  onClick={downloadFailedRows}
                  className="ml-auto px-3 py-2 rounded-lg border border-line text-[12px] font-medium text-ink-2 hover:border-ink-3 inline-flex items-center gap-1.5"
                >
                  <Download size={13} />
                  Failed rows ({report.invalidRows})
                </button>
              )}
            </div>
          </section>

          {errorBanner !== null && (
            <div className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-900 flex items-start gap-2">
              <AlertCircle size={15} className="mt-px shrink-0" aria-hidden />
              <span>{errorBanner}</span>
            </div>
          )}

          {report !== null && <ReportSummary report={report} />}
          {report !== null && report.rows.length > 0 && <RowsTable report={report} />}
        </div>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function ReportSummary({ report }: { readonly report: ImportReport }) {
  const allGood = report.invalidRows === 0 && report.totalRows > 0;
  return (
    <section
      className={[
        'rounded-xl border p-4 flex items-center gap-3',
        allGood ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50',
      ].join(' ')}
    >
      {allGood ? (
        <CheckCircle2 size={18} className="text-emerald-700 shrink-0" aria-hidden />
      ) : (
        <AlertCircle size={18} className="text-amber-700 shrink-0" aria-hidden />
      )}
      <div className="flex-1">
        <div className="text-[13px] font-semibold tracking-tight">
          {report.committed
            ? `Imported ${report.validRows} of ${report.totalRows} rows.`
            : report.dryRun
              ? `Dry run: ${report.validRows} valid, ${report.invalidRows} need fixing.`
              : `${report.validRows} valid, ${report.invalidRows} failed — nothing imported.`}
        </div>
        <div className="text-[11.5px] text-ink-3 mt-0.5">
          {allGood && !report.committed
            ? 'Press "Import all" to commit. All rows go in one transaction.'
            : report.invalidRows > 0
              ? 'Fix the flagged rows in the source CSV, re-upload, and validate again.'
              : null}
        </div>
      </div>
      <div className="font-mono text-[10.5px] text-ink-3 tabular-nums">
        {report.totalRows} row{report.totalRows === 1 ? '' : 's'}
      </div>
    </section>
  );
}

function RowsTable({ report }: { readonly report: ImportReport }) {
  return (
    <section className="rounded-xl border border-line bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead className="bg-paper-2 border-b border-line">
            <tr className="text-left">
              <th className="px-3 py-2 font-semibold text-ink-2 w-[60px]">Row</th>
              <th className="px-3 py-2 font-semibold text-ink-2 w-[80px]">Status</th>
              <th className="px-3 py-2 font-semibold text-ink-2">Detail</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((r) => (
              <RowLine key={r.rowNumber} row={r} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RowLine({ row }: { readonly row: ImportRowReport }) {
  const date = row.raw['transaction date'] ?? '';
  const amount = row.raw['out (rp.)'] ?? '';
  const description = row.raw['description'] ?? '';
  const category = row.raw['category'] ?? '';
  const method = row.raw['method'] ?? '';
  const reimbursement = row.raw['reimbursement'] ?? '';

  return (
    <tr className="border-b border-line/60 last:border-b-0">
      <td className="px-3 py-2 font-mono text-[11px] text-ink-3 align-top">{row.rowNumber}</td>
      <td className="px-3 py-2 align-top">
        {row.status === 'ok' ? (
          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
            <CheckCircle2 size={13} aria-hidden /> OK
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-rose-700 font-medium">
            <AlertCircle size={13} aria-hidden /> Error
          </span>
        )}
      </td>
      <td className="px-3 py-2 align-top">
        <div className="text-ink-2 truncate max-w-[520px]">
          <span className="font-mono text-[11px]">{date}</span>
          <span className="text-ink-3 mx-1.5">·</span>
          <span className="font-mono text-[11px]">{amount}</span>
          <span className="text-ink-3 mx-1.5">·</span>
          <span>{description}</span>
          <span className="text-ink-3 mx-1.5">·</span>
          <span className="text-ink-3">
            {category} / {method} / {reimbursement}
          </span>
        </div>
        {row.error !== null && (
          <div className="mt-1 text-[11.5px] text-rose-700">
            <span className="font-mono text-[10.5px] uppercase mr-1.5">
              {row.error.field ?? row.error.code}
            </span>
            {row.error.message}
          </div>
        )}
      </td>
    </tr>
  );
}

function serializeFailedRows(rows: ReadonlyArray<ImportRowReport>): string {
  // Re-emit the original Sheets format so the user can fix in their tool of
  // choice and re-import without manual column-juggling.
  const header = [
    'Days',
    'Transaction Date',
    'Out (Rp.)',
    'Description',
    'Category',
    'Method',
    'Reimbursement',
    'Error',
  ];
  const escape = (v: string): string => {
    if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
    return v;
  };
  const lines = [header.join(',')];
  for (const r of rows) {
    const cells = [
      r.raw['days'] ?? '',
      r.raw['transaction date'] ?? '',
      r.raw['out (rp.)'] ?? '',
      r.raw['description'] ?? '',
      r.raw['category'] ?? '',
      r.raw['method'] ?? '',
      r.raw['reimbursement'] ?? '',
      r.error
        ? `[${r.error.field ?? r.error.code}] ${r.error.message}`
        : '',
    ].map(escape);
    lines.push(cells.join(','));
  }
  return lines.join('\n');
}

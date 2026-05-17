import { useRef, useState } from 'react';
import { Download, FileText, Loader2, Printer } from 'lucide-react';

import { ApiError } from '../api/http';
import { reportingApi } from '../api/reporting';
import type { ReceiptView } from '../api/types';
import { Toast, type ToastState } from '../components/Toast';
import { formatMoney } from '../lib/money';

function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function firstOfThisMonthYmd(): string {
  const now = new Date();
  return localYmd(new Date(now.getFullYear(), now.getMonth(), 1));
}
function todayYmd(): string {
  return localYmd(new Date());
}
function ymdToLocalIso(ymd: string, endOfDay: boolean): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return new Date().toISOString();
  const dt = endOfDay
    ? new Date(y, m - 1, d, 23, 59, 59, 999)
    : new Date(y, m - 1, d, 0, 0, 0, 0);
  return dt.toISOString();
}

export default function Receipt() {
  const [dateStart, setDateStart] = useState(firstOfThisMonthYmd());
  const [dateEnd, setDateEnd] = useState(todayYmd());

  const [receipt, setReceipt] = useState<ReceiptView | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastIdRef = useRef(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const generate = async () => {
    setLoading(true);
    setErrorBanner(null);
    setReceipt(null);
    setHtml(null);
    const isoStart = ymdToLocalIso(dateStart, false);
    const isoEnd = ymdToLocalIso(dateEnd, true);
    try {
      const [json, htmlBody] = await Promise.all([
        reportingApi.receiptJson(isoStart, isoEnd),
        reportingApi.receiptHtml(isoStart, isoEnd),
      ]);
      setReceipt(json);
      setHtml(htmlBody);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.code === 'mixed_currency_in_range'
            ? "Receipts can't span multiple currencies. Narrow the date range."
            : e.message
          : e instanceof Error
            ? e.message
            : 'Failed to generate receipt';
      setErrorBanner(msg);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (kind: ToastState['kind'], message: string) => {
    toastIdRef.current += 1;
    setToast({ id: toastIdRef.current, kind, message });
  };

  const print = () => {
    const w = iframeRef.current?.contentWindow;
    if (!w) {
      showToast('error', 'Could not access print preview');
      return;
    }
    w.focus();
    w.print();
  };

  const csvUrl = reportingApi.receiptCsvUrl(
    ymdToLocalIso(dateStart, false),
    ymdToLocalIso(dateEnd, true),
  );

  return (
    <div className="min-h-full px-4 py-5 md:px-8 md:py-8">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <header className="mb-5 max-w-4xl">
        <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
          Export
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-0.5">Receipt</h1>
        <p className="text-[13px] text-stone-500 mt-1">
          A summary of what's owed to you, grouped by description.
        </p>
      </header>

      <section className="max-w-4xl bg-paper-2 rounded-lg p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <FieldWrap label="From">
            <input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              className="filter-input"
            />
          </FieldWrap>
          <FieldWrap label="To">
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              className="filter-input"
            />
          </FieldWrap>
          <button
            type="button"
            onClick={() => void generate()}
            disabled={loading}
            className="py-2.5 rounded-lg text-[13px] font-semibold text-stone-50 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 className="animate-spin" size={14} /> : <FileText size={14} />}
            {loading ? 'Generating…' : 'Generate'}
          </button>
        </div>
        <style>{`
          .filter-input {
            width: 100%;
            padding: 0.5rem 0.875rem;
            border-radius: 0.5rem;
            border: 1px solid #d6d3d1;
            background: white;
            font-size: 13px;
            outline: none;
          }
          .filter-input:focus {
            border-color: #0a0908;
            box-shadow: 0 0 0 2px rgb(10 9 8 / 0.1);
          }
        `}</style>
      </section>

      {errorBanner && (
        <div className="max-w-4xl mb-5 px-4 py-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-[13px]">
          {errorBanner}
        </div>
      )}

      {receipt && html && (
        <section className="max-w-4xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="text-[13px] text-stone-700">
              <strong className="font-semibold">{receipt.lines.length}</strong> line item
              {receipt.lines.length === 1 ? '' : 's'}
              {receipt.grandTotal && receipt.currency && (
                <>
                  {' · grand total '}
                  <strong className="font-semibold tabular-nums">
                    {formatMoney({
                      amountMinor: receipt.grandTotal.amountMinor,
                      currency: receipt.currency,
                    })}
                  </strong>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={print}
                className="px-3 py-2 rounded-lg border border-stone-300 text-[13px] font-medium hover:bg-stone-50 inline-flex items-center gap-1.5"
              >
                <Printer size={14} />
                Print
              </button>
              <a
                href={csvUrl}
                download
                className="px-3 py-2 rounded-lg border border-stone-300 text-[13px] font-medium hover:bg-stone-50 inline-flex items-center gap-1.5"
              >
                <Download size={14} />
                CSV
              </a>
              <button
                type="button"
                disabled
                title="PDF export ships with Milestone H.4"
                className="px-3 py-2 rounded-lg border border-stone-300 text-[13px] font-medium text-stone-400 cursor-not-allowed inline-flex items-center gap-1.5"
              >
                <Download size={14} />
                PDF
              </button>
            </div>
          </div>

          <iframe
            ref={iframeRef}
            title="Receipt preview"
            srcDoc={html}
            className="w-full h-[70vh] border border-line rounded-lg bg-white"
          />
        </section>
      )}

      {!receipt && !errorBanner && !loading && (
        <p className="text-[13px] text-stone-500">
          Pick a date range and hit <strong>Generate</strong> to preview the printable receipt.
        </p>
      )}
    </div>
  );
}

function FieldWrap({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
        {label}
      </span>
      {children}
    </label>
  );
}

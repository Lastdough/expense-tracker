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

  const grandTotalLabel =
    receipt?.grandTotal && receipt.currency
      ? formatMoney({ amountMinor: receipt.grandTotal.amountMinor, currency: receipt.currency })
      : null;

  return (
    <div className="min-h-full flex flex-col">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Header */}
      <header className="px-5 md:px-8 pt-5 md:pt-6 pb-4 md:pb-5 border-b border-line flex items-baseline justify-between gap-3 flex-shrink-0">
        <div>
          <div className="text-[11px] md:text-[11.5px] uppercase tracking-wider text-ink-3 font-semibold">
            Receipt export
          </div>
          <h1 className="text-[22px] md:text-[28px] font-bold tracking-tight mt-0.5">
            Build a receipt
          </h1>
        </div>
        {receipt && (
          <div className="hidden md:flex items-center gap-2">
            <a
              href={csvUrl}
              download
              className="px-3 py-1.5 rounded-lg border border-line bg-white text-[12.5px] font-medium text-ink-2 hover:border-ink-3 inline-flex items-center gap-1.5"
            >
              <Download size={13} />
              CSV
            </a>
            <button
              type="button"
              onClick={print}
              className="px-3 py-1.5 rounded-lg border border-line bg-white text-[12.5px] font-medium text-ink-2 hover:border-ink-3 inline-flex items-center gap-1.5"
            >
              <Printer size={13} />
              Print
            </button>
            <button
              type="button"
              disabled
              title="PDF export ships with Milestone H.4"
              className="px-4 py-1.5 rounded-lg bg-ink/40 text-paper text-[12.5px] font-semibold cursor-not-allowed inline-flex items-center gap-1.5"
            >
              <Download size={13} />
              PDF
            </button>
          </div>
        )}
      </header>

      {/* Body */}
      <div className="flex-1 min-h-0 md:grid md:grid-cols-[360px_1fr] overflow-hidden">
        {/* Builder column */}
        <aside className="md:border-r border-line md:overflow-y-auto px-5 md:px-6 py-5 flex flex-col gap-5 bg-paper-2/60">
          <Section label="Date range">
            <div className="grid grid-cols-2 gap-2">
              <FieldInline label="From">
                <input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="builder-input"
                />
              </FieldInline>
              <FieldInline label="To">
                <input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="builder-input"
                />
              </FieldInline>
            </div>
          </Section>

          <button
            type="button"
            onClick={() => void generate()}
            disabled={loading}
            className="py-2.5 rounded-xl bg-ink text-paper text-[13px] font-semibold hover:bg-ink-2 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 className="animate-spin" size={14} /> : <FileText size={14} />}
            {loading ? 'Generating…' : 'Generate receipt'}
          </button>

          {receipt && (
            <div className="rounded-xl border border-line bg-white p-3.5">
              <div className="text-[10.5px] uppercase tracking-wider text-ink-3 font-semibold">
                Summary
              </div>
              <div className="mt-1 font-mono text-[20px] font-bold tracking-tight tabular-nums">
                {grandTotalLabel ?? '—'}
              </div>
              <div className="text-[11px] text-ink-3 mt-0.5">
                {receipt.lines.length} line item{receipt.lines.length === 1 ? '' : 's'}
                {' · grand total owed'}
              </div>
            </div>
          )}

          {receipt && (
            <div className="md:hidden flex gap-2">
              <a
                href={csvUrl}
                download
                className="flex-1 py-2.5 rounded-xl border border-line bg-white text-[13px] font-medium text-ink-2 inline-flex items-center justify-center gap-1.5"
              >
                <Download size={13} />
                CSV
              </a>
              <button
                type="button"
                onClick={print}
                className="flex-1 py-2.5 rounded-xl border border-line bg-white text-[13px] font-medium text-ink-2 inline-flex items-center justify-center gap-1.5"
              >
                <Printer size={13} />
                Print
              </button>
            </div>
          )}

          <div className="text-[11px] text-ink-3 leading-relaxed border-t border-line pt-3 mt-auto hidden md:block">
            Pick a date range and tap{' '}
            <span className="font-semibold text-ink-2">Generate</span> to render the printable
            receipt on the right. CSV downloads the same data for spreadsheet imports. PDF ships
            with Milestone H.4.
          </div>
        </aside>

        {/* Preview pane */}
        <div className="md:overflow-y-auto bg-paper-2/30 px-3 md:px-10 py-5 md:py-8">
          {errorBanner && (
            <div className="max-w-[640px] mx-auto mb-5 px-4 py-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-[13px]">
              {errorBanner}
            </div>
          )}

          {!receipt && !errorBanner && !loading && (
            <div className="max-w-[640px] mx-auto text-center py-16">
              <div className="text-[13px] text-ink-3">
                The preview appears here once you tap{' '}
                <span className="font-semibold text-ink-2">Generate receipt</span>.
              </div>
            </div>
          )}

          {receipt && html && (
            <div className="max-w-[640px] mx-auto bg-white border border-line shadow-[0_18px_48px_-18px_rgba(0,0,0,.18)] rounded-md overflow-hidden">
              <iframe
                ref={iframeRef}
                title="Receipt preview"
                srcDoc={html}
                className="w-full h-[70vh] md:h-[78vh] bg-white"
              />
            </div>
          )}
        </div>
      </div>

      <style>{`
        .builder-input {
          width: 100%;
          padding: 0.5rem 0.625rem;
          border-radius: 0.5rem;
          border: 1px solid #e3ddd0;
          background: white;
          font-size: 12.5px;
          font-family: var(--font-mono);
          outline: none;
        }
        .builder-input:focus {
          border-color: #0a0908;
          box-shadow: 0 0 0 2px rgb(10 9 8 / 0.1);
        }
      `}</style>
    </div>
  );
}

function Section({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold mb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}

function FieldInline({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold">{label}</span>
      {children}
    </label>
  );
}

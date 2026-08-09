import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileSpreadsheet, Loader2, Printer } from 'lucide-react';

import { ApiError } from '../api/http';
import { reportingApi } from '../api/reporting';
import type { ReceiptView } from '../api/types';
import { BottomSheet, useIsMobile } from '../components/BottomSheet';
import {
  DatePicker,
  RangeTrigger,
  fromIso,
  toIso,
  type DateRange,
} from '../components/DatePicker';
import { Popover } from '../components/Popover';
import { Toast, type ToastState } from '../components/Toast';
import { todayYmd, ymdToExclusiveEndIso, ymdToIso } from '../lib/date';
import { formatMoney } from '../lib/money';

function firstOfThisMonthYmd(): string {
  return `${todayYmd().slice(0, 7)}-01`;
}

const DEBOUNCE_MS = 400;

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
  // True between "user clicked Print without a preview ready" and the iframe
  // finishing its load — `onIframeLoad` reads this and fires print() once
  // the (possibly still-in-flight) srcDoc is fully parsed.
  const pendingPrintRef = useRef(false);
  // Monotonic counter so stale fetches (debounced or superseded) skip the
  // state writes when a newer fetch has started.
  const requestVersionRef = useRef(0);
  // Pending debounce timer, kept in a ref so handlePrint can cancel it.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // First mount fetches immediately; subsequent date changes debounce.
  const isFirstRunRef = useRef(true);

  const fetchPreview = async (): Promise<boolean> => {
    const version = ++requestVersionRef.current;
    setLoading(true);
    setErrorBanner(null);
    const isoStart = ymdToIso(dateStart);
    const isoEnd = ymdToExclusiveEndIso(dateEnd);
    try {
      const [json, htmlBody] = await Promise.all([
        reportingApi.receiptJson(isoStart, isoEnd),
        reportingApi.receiptHtml(isoStart, isoEnd),
      ]);
      if (version !== requestVersionRef.current) return false;
      setReceipt(json);
      setHtml(htmlBody);
      return true;
    } catch (e) {
      if (version !== requestVersionRef.current) return false;
      const msg =
        e instanceof ApiError
          ? e.code === 'mixed_currency_in_range'
            ? "Receipts can't span multiple currencies. Narrow the date range."
            : e.message
          : e instanceof Error
            ? e.message
            : 'Failed to generate receipt';
      setErrorBanner(msg);
      setReceipt(null);
      setHtml(null);
      pendingPrintRef.current = false;
      return false;
    } finally {
      if (version === requestVersionRef.current) setLoading(false);
    }
  };

  // Auto-preview: refetch on date-range change. First run fires immediately
  // so the iframe populates on mount; later changes debounce so rapid date
  // edits don't thrash the API.
  useEffect(() => {
    pendingPrintRef.current = false;
    const delay = isFirstRunRef.current ? 0 : DEBOUNCE_MS;
    isFirstRunRef.current = false;
    if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void fetchPreview();
    }, delay);
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [dateStart, dateEnd]);

  const showToast = (kind: ToastState['kind'], message: string) => {
    toastIdRef.current += 1;
    setToast({ id: toastIdRef.current, kind, message });
  };

  const printIframe = () => {
    const w = iframeRef.current?.contentWindow;
    if (!w) {
      showToast('error', 'Could not access print preview');
      return;
    }
    w.focus();
    w.print();
  };

  const onIframeLoad = () => {
    if (pendingPrintRef.current) {
      pendingPrintRef.current = false;
      // Defer one tick so layout settles before opening the print dialog.
      setTimeout(printIframe, 0);
    }
  };

  const handlePrint = async () => {
    if (html && !loading) {
      printIframe();
      return;
    }
    // Race: user hit Print before the debounced auto-preview finished (or
    // fired). Cancel the pending debounce, fetch now, and let onIframeLoad
    // pick up the print intent.
    pendingPrintRef.current = true;
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (!loading) {
      const ok = await fetchPreview();
      if (!ok) pendingPrintRef.current = false;
    }
  };

  const csvUrl = reportingApi.receiptCsvUrl(
    ymdToIso(dateStart),
    ymdToExclusiveEndIso(dateEnd),
  );

  const grandTotalLabel =
    receipt?.grandTotal && receipt.currency
      ? formatMoney({ amountMinor: receipt.grandTotal.amountMinor, currency: receipt.currency })
      : null;

  return (
    <div className="min-h-full flex flex-col">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Header */}
      <header className="px-5 md:px-8 pt-5 md:pt-6 pb-4 md:pb-5 border-b border-line flex items-center justify-between gap-3 flex-shrink-0">
        <div>
          <div className="text-[11px] md:text-[11.5px] uppercase tracking-wider text-ink-3 font-semibold">
            Receipt export
          </div>
          <h1 className="text-[22px] md:text-[28px] font-bold tracking-tight mt-0.5">
            Build a receipt
          </h1>
        </div>
        <div className="hidden md:block">
          <ExportMenu csvUrl={csvUrl} loading={loading} onPrint={() => void handlePrint()} />
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 min-h-0 md:grid md:grid-cols-[360px_1fr] overflow-hidden">
        {/* Builder column */}
        <aside className="md:border-r border-line md:overflow-y-auto px-5 md:px-6 py-5 flex flex-col gap-5 bg-paper-2/60">
          <Section label="Date range">
            <ReceiptRangeField
              start={dateStart}
              end={dateEnd}
              onChange={(next) => {
                if (next.start) setDateStart(toIso(next.start));
                if (next.end) setDateEnd(toIso(next.end));
              }}
            />
          </Section>

          {/* Mobile-only — full-width split button placed where Generate was. */}
          <div className="md:hidden">
            <ExportMenu
              csvUrl={csvUrl}
              loading={loading}
              onPrint={() => void handlePrint()}
              fullWidth
            />
          </div>

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

          <div className="text-[11px] text-ink-3 leading-relaxed border-t border-line pt-3 mt-auto hidden md:block">
            The preview updates as you change the range. Use the Export menu for{' '}
            <span className="font-semibold text-ink-2">CSV</span> or{' '}
            <span className="font-semibold text-ink-2">Print</span>. PDF ships with Milestone H.4.
          </div>
        </aside>

        {/* Preview pane */}
        <div className="md:overflow-y-auto bg-paper-2/30 px-3 md:px-10 py-5 md:py-8">
          {errorBanner && (
            <div className="max-w-[640px] mx-auto mb-5 px-4 py-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-[13px]">
              {errorBanner}
            </div>
          )}

          {!receipt && !errorBanner && (
            <div className="max-w-[640px] mx-auto text-center py-16">
              {loading ? (
                <>
                  <Loader2 className="animate-spin mx-auto text-ink-3" size={20} />
                  <div className="text-[13px] text-ink-3 mt-2">Loading preview…</div>
                </>
              ) : (
                <div className="text-[13px] text-ink-3">No preview yet.</div>
              )}
            </div>
          )}

          {receipt && html && (
            <div className="max-w-[640px] mx-auto bg-white border border-line shadow-[0_18px_48px_-18px_rgba(0,0,0,.18)] rounded-md overflow-hidden relative">
              {loading && (
                <div className="absolute top-2 right-2 z-10 px-2 py-1 rounded-md bg-white/90 border border-line text-[10.5px] uppercase tracking-wider text-ink-3 font-semibold inline-flex items-center gap-1.5 shadow-sm">
                  <Loader2 className="animate-spin" size={11} />
                  Updating
                </div>
              )}
              <iframe
                ref={iframeRef}
                title="Receipt preview"
                srcDoc={html}
                onLoad={onIframeLoad}
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

interface ExportMenuProps {
  readonly csvUrl: string;
  readonly loading: boolean;
  readonly onPrint: () => void;
  readonly fullWidth?: boolean;
}

/**
 * Split button matching `docs/design/v2.3/receipt-print.jsx <ExportMenu>`.
 *
 * Primary slot is "Export PDF" rendered visibly disabled (the H.4 milestone
 * delivers the actual PDF). Chevron opens a popover (desktop) or bottom
 * sheet (mobile) with Print and CSV actions. The preview is kept live by
 * the page's debounced auto-fetch, so menu items always operate on the
 * current range.
 */
function ExportMenu({ csvUrl, loading, onPrint, fullWidth = false }: ExportMenuProps) {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const mobile = useIsMobile();

  const handlePrint = () => {
    setOpen(false);
    onPrint();
  };
  const handleCsv = () => {
    setOpen(false);
  };

  const sheetFrame = mobile
    ? 'p-2'
    : 'w-[260px] bg-white rounded-xl border border-line p-1.5 shadow-[0_18px_48px_-16px_rgba(40,30,20,0.28),0_2px_6px_rgba(40,30,20,0.06)]';

  const menuItems = (
    <div role="menu" className={sheetFrame}>
      <button
        type="button"
        role="menuitem"
        onClick={handlePrint}
        className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-paper-2 text-[13px]"
      >
        <span className="w-8 h-8 rounded-lg bg-paper-2 inline-flex items-center justify-center text-ink-2 flex-shrink-0">
          <Printer size={15} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-ink">Print…</span>
          <span className="block text-[11px] text-ink-3">System dialog · uses @media print</span>
        </span>
      </button>
      <a
        role="menuitem"
        href={csvUrl}
        download
        onClick={handleCsv}
        className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-paper-2 text-[13px]"
      >
        <span className="w-8 h-8 rounded-lg bg-paper-2 inline-flex items-center justify-center text-ink-2 flex-shrink-0">
          <FileSpreadsheet size={15} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-ink">Download CSV</span>
          <span className="block text-[11px] text-ink-3">For spreadsheets · raw rows</span>
        </span>
      </a>
      <div className="h-px bg-line my-1 mx-1.5" />
      <div className="px-2 py-2 text-[11px] text-ink-3 leading-snug">
        <span className="font-semibold text-ink-2">PDF</span> ships with Milestone H.4.
      </div>
    </div>
  );

  return (
    <div ref={anchorRef} className={`relative ${fullWidth ? 'w-full' : 'inline-block'}`}>
      <div className={`inline-flex ${fullWidth ? 'w-full' : ''}`}>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="PDF export ships with Milestone H.4"
          className={`px-4 py-2.5 rounded-l-xl bg-ink/45 text-paper text-[13px] font-semibold cursor-not-allowed inline-flex items-center justify-center gap-1.5 ${
            fullWidth ? 'flex-1' : ''
          }`}
        >
          {loading ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
          Export PDF
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Other export options"
          className="px-2.5 py-2.5 rounded-r-xl bg-ink text-paper border-l border-paper/20 hover:bg-ink-2 inline-flex items-center justify-center"
        >
          <ChevronDown size={14} />
        </button>
      </div>
      {mobile ? (
        <BottomSheet open={open} onClose={() => setOpen(false)} title="Export">
          {menuItems}
        </BottomSheet>
      ) : (
        <Popover
          open={open}
          anchorRef={anchorRef}
          onClose={() => setOpen(false)}
          placement="bottom-end"
        >
          {menuItems}
        </Popover>
      )}
    </div>
  );
}

function ReceiptRangeField({
  start,
  end,
  onChange,
}: {
  readonly start: string;
  readonly end: string;
  readonly onChange: (next: DateRange) => void;
}) {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const mobile = useIsMobile();
  const range: DateRange = { start: fromIso(start), end: fromIso(end) };

  const handleCommit = (next: DateRange) => {
    onChange(next);
    if (next.start && next.end) setOpen(false);
  };

  const picker = (
    <DatePicker
      mode="range"
      value={range}
      onChange={handleCommit}
      presets={mobile ? 'topbar' : 'sidebar'}
      showFooter={!mobile}
      inSheet={mobile}
    />
  );

  return (
    <div ref={anchorRef} className="relative">
      <RangeTrigger range={range} open={open} onClick={() => setOpen((v) => !v)} />
      {mobile ? (
        <BottomSheet open={open} onClose={() => setOpen(false)} title="Date range">
          {picker}
        </BottomSheet>
      ) : (
        <Popover open={open} anchorRef={anchorRef} onClose={() => setOpen(false)}>
          {picker}
        </Popover>
      )}
    </div>
  );
}

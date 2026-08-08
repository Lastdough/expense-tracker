import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';

import { reportingApi } from '../api/reporting';
import type { NetOwedView } from '../api/types';
import { todayYmd } from '../lib/date';
import { formatMoney } from '../lib/money';
import { NAV } from './nav';

interface SideRailProps {
  readonly className?: string;
}

// Half-open UTC range for the current month. Built in UTC to match the
// server's `MonthRange`, and the upper bound is the first instant of next
// month rather than 23:59:59.999 — server filters are half-open (`gte`/`lt`),
// so the old bound both drifted by the local offset and clipped the last day.
function monthRangeIso(): { startIso: string; endIso: string } {
  const [y, m] = todayYmd().split('-').map(Number);
  return {
    startIso: new Date(Date.UTC(y!, m! - 1, 1)).toISOString(),
    endIso: new Date(Date.UTC(y!, m!, 1)).toISOString(),
  };
}

export function SideRail({ className = '' }: SideRailProps) {
  const [netOwed, setNetOwed] = useState<NetOwedView | null>(null);
  const [netOwedError, setNetOwedError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const { startIso, endIso } = monthRangeIso();
    reportingApi
      .netOwed(startIso, endIso)
      .then((v) => {
        if (!cancelled) setNetOwed(v);
      })
      .catch(() => {
        if (!cancelled) setNetOwedError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside
      className={`w-[232px] shrink-0 border-r border-line bg-paper-2 flex-col ${className}`}
    >
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center bg-ink text-paper font-bold text-[13px]">
            L
          </div>
          <div>
            <div className="text-[14px] font-bold tracking-tight">Ledger</div>
            <div className="text-[10.5px] text-ink-3 -mt-0.5">personal · IDR</div>
          </div>
        </div>
      </div>
      <nav className="px-3 flex flex-col gap-[2px]">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              [
                'group flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] transition',
                isActive
                  ? 'bg-ink text-paper font-semibold'
                  : 'text-ink-2 hover:bg-line/60 font-medium',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <n.icon size={15} aria-hidden />
                <span className="flex-1 text-left">{n.label}</span>
                <span
                  className={[
                    'text-[10px] font-mono px-1.5 py-px rounded border',
                    isActive
                      ? 'border-paper/30 text-paper/70'
                      : 'border-line text-ink-3 group-hover:text-ink-2',
                  ].join(' ')}
                >
                  ⌘{n.kbd}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {!netOwedError && <NetOwedCard netOwed={netOwed} />}
    </aside>
  );
}

function NetOwedCard({ netOwed }: { readonly netOwed: NetOwedView | null }) {
  const currency = netOwed?.currency ?? null;
  const hasData = netOwed && netOwed.netOwed && currency;
  return (
    <div className="mt-auto px-4 pb-5 pt-4">
      <div className="rounded-xl border border-line bg-white p-3.5">
        <div className="text-[10.5px] uppercase tracking-wider text-ink-3 font-semibold">
          Net owed to you
        </div>
        <div className="mt-1 font-mono text-[22px] font-bold tracking-tight tabular-nums">
          {hasData
            ? formatMoney({
                amountMinor: netOwed.netOwed!.amountMinor,
                currency: currency,
              })
            : '—'}
        </div>
        {hasData && netOwed.sumEarly && netOwed.sumUnpaid ? (
          <div className="text-[10.5px] text-ink-3 mt-0.5 tabular-nums">
            Unpaid{' '}
            {formatMoney({
              amountMinor: netOwed.sumUnpaid.amountMinor,
              currency: currency,
            })}{' '}
            − Early{' '}
            {formatMoney({
              amountMinor: netOwed.sumEarly.amountMinor,
              currency: currency,
            })}
          </div>
        ) : (
          <div className="text-[10.5px] text-ink-3 mt-0.5">No reimbursable activity</div>
        )}
      </div>
    </div>
  );
}

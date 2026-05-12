import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CategoriesTab } from './CategoriesTab';
import { MethodsTab } from './MethodsTab';
import { StatusesTab } from './StatusesTab';
import { Toast, type ToastState } from './components/Toast';

type TabId = 'categories' | 'methods' | 'statuses';

interface TabDef {
  readonly id: TabId;
  readonly label: string;
}

const TABS: ReadonlyArray<TabDef> = [
  { id: 'categories', label: 'Categories' },
  { id: 'methods', label: 'Methods' },
  { id: 'statuses', label: 'Statuses' },
];

function isTabId(v: string | null): v is TabId {
  return v === 'categories' || v === 'methods' || v === 'statuses';
}

export default function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const tab: TabId = isTabId(params.get('tab')) ? (params.get('tab') as TabId) : 'categories';
  const setTab = (next: TabId) => {
    const p = new URLSearchParams(params);
    p.set('tab', next);
    setParams(p, { replace: true });
  };

  const [toast, setToast] = useState<ToastState | null>(null);
  const [counts, setCounts] = useState<Record<TabId, number>>({
    categories: 0,
    methods: 0,
    statuses: 0,
  });

  const onSuccess = useCallback(
    (message: string) => setToast({ id: Date.now(), kind: 'success', message }),
    [],
  );
  const onError = useCallback(
    (message: string) => setToast({ id: Date.now(), kind: 'error', message }),
    [],
  );
  const setCount = useCallback(
    (which: TabId) => (n: number) => setCounts((prev) => (prev[which] === n ? prev : { ...prev, [which]: n })),
    [],
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <header className="px-5 md:px-8 pt-6 pb-0 border-b border-line shrink-0">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <div className="text-[11.5px] uppercase tracking-wider text-ink-3 font-semibold">
              Settings
            </div>
            <h1 className="text-[22px] md:text-[28px] font-bold tracking-tight mt-0.5">
              Reference data
            </h1>
          </div>
          <p className="hidden md:block text-[12px] text-ink-3 max-w-sm text-right leading-relaxed">
            These chips are used everywhere — Quick&nbsp;Add, lists, dashboard. Renames update in
            place; archive instead of delete to preserve history.
          </p>
        </div>
        <nav className="mt-5 flex gap-1 overflow-x-auto" aria-label="Settings sections">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-pressed={active}
                className={[
                  'px-4 py-2.5 text-[13px] font-semibold border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap transition',
                  active
                    ? 'border-ink text-ink'
                    : 'border-transparent text-ink-3 hover:text-ink-2',
                ].join(' ')}
              >
                {t.label}
                <span
                  className={[
                    'text-[10.5px] font-mono px-1.5 py-px rounded',
                    active ? 'bg-ink text-paper' : 'bg-line/70 text-ink-2',
                  ].join(' ')}
                >
                  {counts[t.id]}
                </span>
              </button>
            );
          })}
        </nav>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto bg-paper">
        {tab === 'categories' && (
          <CategoriesTab onSuccess={onSuccess} onError={onError} onCountChange={setCount('categories')} />
        )}
        {tab === 'methods' && (
          <MethodsTab onSuccess={onSuccess} onError={onError} onCountChange={setCount('methods')} />
        )}
        {tab === 'statuses' && (
          <StatusesTab onSuccess={onSuccess} onError={onError} onCountChange={setCount('statuses')} />
        )}
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

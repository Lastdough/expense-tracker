import { useEffect, useMemo, useState } from 'react';
import { statusesApi } from '../../api/categorization';
import type { ReimbursementStatusView } from '../../api/types';
import { EditDrawer, type DrawerValues } from './components/EditDrawer';
import { ReferenceTable } from './components/ReferenceTable';
import { useReferenceData } from './useReferenceData';

interface StatusesTabProps {
  readonly onSuccess: (msg: string) => void;
  readonly onError: (msg: string) => void;
  readonly onCountChange?: (n: number) => void;
}

const EMPTY: DrawerValues = { name: '', bgColor: '#e8eaed', textColor: '#000000' };

export function StatusesTab({ onSuccess, onError, onCountChange }: StatusesTabProps) {
  const data = useReferenceData<ReimbursementStatusView>(statusesApi, onError, onSuccess);
  const [showArchived, setShowArchived] = useState(false);
  const [drawer, setDrawer] = useState<
    { mode: 'create' } | { mode: 'edit'; item: ReimbursementStatusView } | null
  >(null);

  useEffect(() => {
    onCountChange?.(data.items.length);
  }, [data.items.length, onCountChange]);

  const initialValues = useMemo<DrawerValues>(() => {
    if (drawer?.mode === 'edit') {
      return {
        name: drawer.item.name,
        bgColor: drawer.item.bgColor,
        textColor: drawer.item.textColor,
      };
    }
    return EMPTY;
  }, [drawer]);

  const handleSubmit = async (values: DrawerValues) => {
    if (drawer?.mode === 'create') {
      await data.create(values);
    } else if (drawer?.mode === 'edit') {
      await data.update(drawer.item.id, values);
    }
    setDrawer(null);
  };

  if (data.loading) {
    return <div className="py-8 text-center text-[13px] text-ink-3">Loading…</div>;
  }
  if (data.error) {
    return (
      <div className="py-8 text-center text-[13px] text-rose-600">
        Failed to load statuses: {data.error}
      </div>
    );
  }

  return (
    <>
      <ReferenceTable
        items={data.items}
        singularLabel="Status"
        showArchived={showArchived}
        onShowArchivedChange={setShowArchived}
        onAdd={() => setDrawer({ mode: 'create' })}
        onEdit={(item) => setDrawer({ mode: 'edit', item })}
        onRename={(item, name) => {
          void data.update(item.id, {
            name,
            bgColor: item.bgColor,
            textColor: item.textColor,
          });
        }}
        onArchive={(item) => {
          void data.archive(item.id);
        }}
        onUnarchive={(item) => {
          void data.unarchive(item.id);
        }}
        onReorder={(ids) => {
          void data.reorder(ids);
        }}
      />
      <EditDrawer
        open={drawer !== null}
        mode={drawer?.mode === 'edit' ? 'edit' : 'create'}
        singularLabel="Status"
        initial={initialValues}
        onClose={() => setDrawer(null)}
        onSubmit={handleSubmit}
      />
    </>
  );
}

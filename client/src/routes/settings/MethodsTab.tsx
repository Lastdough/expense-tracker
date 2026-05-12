import { useEffect, useMemo, useState } from 'react';
import { methodsApi } from '../../api/categorization';
import type { MethodView } from '../../api/types';
import { EditDrawer, type DrawerValues } from './components/EditDrawer';
import { SwatchGrid } from './components/SwatchGrid';
import { useReferenceData } from './useReferenceData';

interface MethodsTabProps {
  readonly onSuccess: (msg: string) => void;
  readonly onError: (msg: string) => void;
  readonly onCountChange?: (n: number) => void;
}

const EMPTY: DrawerValues = { name: '', bgColor: '#143361', textColor: '#a8c0e0' };

export function MethodsTab({ onSuccess, onError, onCountChange }: MethodsTabProps) {
  const data = useReferenceData<MethodView>(methodsApi, onError, onSuccess);
  const [showArchived, setShowArchived] = useState(false);
  const [drawer, setDrawer] = useState<
    | { mode: 'create' }
    | { mode: 'edit'; item: MethodView; target?: 'bg' | 'text' | undefined }
    | null
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
        Failed to load methods: {data.error}
      </div>
    );
  }

  return (
    <>
      <SwatchGrid
        items={data.items}
        singularLabel="Method"
        showArchived={showArchived}
        onShowArchivedChange={setShowArchived}
        onAdd={() => setDrawer({ mode: 'create' })}
        onEdit={(item, target) => setDrawer({ mode: 'edit', item, target })}
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
        singularLabel="Method"
        initial={initialValues}
        initialTarget={drawer?.mode === 'edit' ? drawer.target : undefined}
        onClose={() => setDrawer(null)}
        onSubmit={handleSubmit}
      />
    </>
  );
}

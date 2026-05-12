import { useEffect, useMemo, useState } from 'react';
import { categoriesApi } from '../../api/categorization';
import type { CategoryView } from '../../api/types';
import { EditDrawer, type DrawerValues } from './components/EditDrawer';
import { ReferenceTable } from './components/ReferenceTable';
import { useReferenceData } from './useReferenceData';

interface CategoriesTabProps {
  readonly onSuccess: (msg: string) => void;
  readonly onError: (msg: string) => void;
  readonly onCountChange?: (n: number) => void;
}

const EMPTY: DrawerValues = { name: '', bgColor: '#e8eaed', textColor: '#000000' };

export function CategoriesTab({ onSuccess, onError, onCountChange }: CategoriesTabProps) {
  const data = useReferenceData<CategoryView>(categoriesApi, onError, onSuccess);
  const [showArchived, setShowArchived] = useState(false);
  const [drawer, setDrawer] = useState<
    { mode: 'create' } | { mode: 'edit'; item: CategoryView } | null
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
        Failed to load categories: {data.error}
      </div>
    );
  }

  return (
    <>
      <ReferenceTable
        items={data.items}
        singularLabel="Category"
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
        singularLabel="Category"
        initial={initialValues}
        onClose={() => setDrawer(null)}
        onSubmit={handleSubmit}
      />
    </>
  );
}

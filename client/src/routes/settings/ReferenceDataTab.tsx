import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import type { ReferenceApi } from '../../api/categorization';
import type { ReferenceView } from '../../api/types';
import { EditDrawer, type DrawerValues } from './components/EditDrawer';
import { useReferenceData } from './useReferenceData';

type ColorTarget = 'bg' | 'text';

export interface GridProps<T extends ReferenceView> {
  readonly items: ReadonlyArray<T>;
  readonly singularLabel: string;
  readonly showArchived: boolean;
  readonly onShowArchivedChange: (next: boolean) => void;
  readonly onAdd: () => void;
  readonly onEdit: (item: T, target?: ColorTarget) => void;
  readonly onRename: (item: T, name: string) => void;
  readonly onArchive: (item: T) => void;
  readonly onUnarchive: (item: T) => void;
  readonly onReorder: (orderedIds: ReadonlyArray<string>) => void;
}

interface ReferenceDataTabProps<T extends ReferenceView> {
  readonly api: ReferenceApi<T>;
  readonly singularLabel: string;
  readonly pluralLabel: string;
  readonly defaults: DrawerValues;
  readonly View: ComponentType<GridProps<T>>;
  readonly onSuccess: (msg: string) => void;
  readonly onError: (msg: string) => void;
  readonly onCountChange?: (n: number) => void;
}

type DrawerState<T> =
  | { mode: 'create' }
  | { mode: 'edit'; item: T; target?: ColorTarget | undefined }
  | null;

export function ReferenceDataTab<T extends ReferenceView>({
  api,
  singularLabel,
  pluralLabel,
  defaults,
  View,
  onSuccess,
  onError,
  onCountChange,
}: ReferenceDataTabProps<T>) {
  const data = useReferenceData<T>(api, onError, onSuccess);
  const [showArchived, setShowArchived] = useState(false);
  const [drawer, setDrawer] = useState<DrawerState<T>>(null);

  useEffect(() => {
    onCountChange?.(data.items.length);
  }, [data.items.length, onCountChange]);

  const initialValues: DrawerValues =
    drawer?.mode === 'edit'
      ? { name: drawer.item.name, bgColor: drawer.item.bgColor, textColor: drawer.item.textColor }
      : defaults;

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
        Failed to load {pluralLabel}: {data.error}
      </div>
    );
  }

  return (
    <>
      <View
        items={data.items}
        singularLabel={singularLabel}
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
        singularLabel={singularLabel}
        initial={initialValues}
        initialTarget={drawer?.mode === 'edit' ? drawer.target : undefined}
        onClose={() => setDrawer(null)}
        onSubmit={handleSubmit}
      />
    </>
  );
}

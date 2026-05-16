import { DndContext, closestCenter } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Archive, GripVertical, RotateCcw } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { ReferenceView } from '../../../api/types';
import type { GridProps } from '../ReferenceDataTab';
import { useInlineRename } from '../useInlineRename';
import { useReorderableList } from '../useReorderableList';
import { Chip } from './Chip';
import { ColorDot } from './ColorDot';
import { ShowArchivedToggle } from './ShowArchivedToggle';

type ColorTarget = 'bg' | 'text';

const GRID = 'grid-cols-[28px_minmax(0,1fr)_minmax(0,1.6fr)_120px_120px_64px_120px]';

export function ReferenceTable<T extends ReferenceView>({
  items,
  singularLabel,
  showArchived,
  onShowArchivedChange,
  onAdd,
  onEdit,
  onRename,
  onArchive,
  onUnarchive,
  onReorder,
}: GridProps<T>) {
  const active = items.filter((i) => !i.isArchived);
  const archived = items.filter((i) => i.isArchived);
  const { sensors, handleDragEnd } = useReorderableList({ items: active, onReorder });

  return (
    <div className="px-5 md:px-8 py-6 flex flex-col gap-4">
      <ShowArchivedToggle
        checked={showArchived}
        onChange={onShowArchivedChange}
        archivedCount={archived.length}
        hint="Drag rows to reorder · displayOrder is 1-indexed"
      />

      <div className="rounded-xl border border-line bg-white overflow-hidden">
        <div
          className={`grid ${GRID} items-center px-4 py-2.5 border-b border-line bg-paper-2/60 text-[10.5px] uppercase tracking-wider font-semibold text-ink-3`}
        >
          <div />
          <div>Preview</div>
          <div>Name</div>
          <div>Background</div>
          <div>Foreground</div>
          <div className="text-right">Order</div>
          <div className="text-right">Actions</div>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={active.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            {active.length === 0 && (
              <div className="px-4 py-6 text-center text-[13px] text-ink-3">
                No active {singularLabel.toLowerCase()}s. Click "New {singularLabel.toLowerCase()}"
                to create one.
              </div>
            )}
            {active.map((item, i) => (
              <SortableRow
                key={item.id}
                item={item}
                order={i + 1}
                onEdit={(target) => onEdit(item, target)}
                onRename={(name) => onRename(item, name)}
                onArchive={() => onArchive(item)}
              />
            ))}
          </SortableContext>
        </DndContext>

        <button
          type="button"
          onClick={onAdd}
          className="w-full px-4 py-3 text-[12.5px] text-ink-3 hover:text-ink hover:bg-paper-2/50 transition flex items-center gap-2 border-t border-dashed border-line"
        >
          <span className="w-5 h-5 rounded-md border border-dashed border-line flex items-center justify-center text-ink-3">
            +
          </span>
          New {singularLabel.toLowerCase()}
        </button>
      </div>

      {showArchived && archived.length > 0 && (
        <div className="rounded-xl border border-line bg-white overflow-hidden">
          <div className="px-4 py-2 border-b border-line bg-paper-2/60 text-[10.5px] font-bold uppercase tracking-wider text-ink-3">
            Archived
          </div>
          {archived.map((item) => (
            <ArchivedRow
              key={item.id}
              item={item}
              onEdit={(target) => onEdit(item, target)}
              onUnarchive={() => onUnarchive(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface RowProps<T extends ReferenceView> {
  readonly item: T;
  readonly order: number;
  readonly onEdit: (target?: ColorTarget) => void;
  readonly onRename: (name: string) => void;
  readonly onArchive: () => void;
}

function SortableRow<T extends ReferenceView>({
  item,
  order,
  onEdit,
  onRename,
  onArchive,
}: RowProps<T>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const rename = useInlineRename({ initial: item.name, onCommit: onRename });

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`grid ${GRID} items-center px-4 py-2.5 border-b border-line/60 last:border-b-0 hover:bg-paper-2/40 transition`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-ink-3/60 hover:text-ink-2 cursor-grab active:cursor-grabbing touch-none"
        aria-label={`Reorder ${item.name}`}
      >
        <GripVertical size={14} />
      </button>
      <div className="min-w-0">
        <Chip token={item} size="md" />
      </div>
      <div className="min-w-0">
        <input
          value={rename.value}
          onChange={rename.onChange}
          onBlur={rename.onBlur}
          onKeyDown={rename.onKeyDown}
          maxLength={64}
          className="w-full bg-transparent text-[13.5px] font-medium px-1.5 -mx-1.5 py-0.5 rounded outline-none border border-transparent hover:border-line focus:border-ink focus:bg-white transition"
        />
      </div>
      <ColorDot hex={item.bgColor} onClick={() => onEdit('bg')} />
      <ColorDot hex={item.textColor} onClick={() => onEdit('text')} />
      <div className="text-right font-mono text-[12px] text-ink-3">{order}</div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onArchive}
          aria-label={`Archive ${item.name}`}
          title="Archive"
          className="w-7 h-7 inline-flex items-center justify-center rounded-md text-ink-3 hover:text-ink hover:bg-paper-2"
        >
          <Archive size={14} />
        </button>
      </div>
    </div>
  );
}

function ArchivedRow<T extends ReferenceView>({
  item,
  onEdit,
  onUnarchive,
}: {
  readonly item: T;
  readonly onEdit: (target?: ColorTarget) => void;
  readonly onUnarchive: () => void;
}) {
  return (
    <div
      className={`grid ${GRID} items-center px-4 py-2.5 border-b border-line/60 last:border-b-0 text-[13px] opacity-60`}
    >
      <span />
      <div className="min-w-0">
        <Chip token={item} size="md" />
      </div>
      <div className="font-medium truncate pr-3 italic">{item.name}</div>
      <ColorDot hex={item.bgColor} onClick={() => onEdit('bg')} />
      <ColorDot hex={item.textColor} onClick={() => onEdit('text')} />
      <div className="text-right font-mono text-[12px] text-ink-3">—</div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onUnarchive}
          aria-label={`Unarchive ${item.name}`}
          title="Restore"
          className="w-7 h-7 inline-flex items-center justify-center rounded-md text-ink-3 hover:text-ink hover:bg-paper-2"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
}

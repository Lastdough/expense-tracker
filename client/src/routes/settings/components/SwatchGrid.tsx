import { DndContext, closestCenter } from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Archive, GripVertical, RotateCcw } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { ReferenceView } from '../../../api/types';
import type { GridProps } from '../ReferenceDataTab';
import { useInlineRename } from '../useInlineRename';
import { useReorderableList } from '../useReorderableList';
import { ColorDot } from './ColorDot';
import { ShowArchivedToggle } from './ShowArchivedToggle';

type ColorTarget = 'bg' | 'text';

export function SwatchGrid<T extends ReferenceView>({
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
        hint="Drag any card to reorder · click a swatch to change colors"
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={active.map((i) => i.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.length === 0 && (
              <div className="col-span-full text-center text-[13px] text-ink-3 py-8 border border-dashed border-line rounded-xl">
                No active {singularLabel.toLowerCase()}s. Click the "+ New" card to create one.
              </div>
            )}
            {active.map((item) => (
              <SortableCard
                key={item.id}
                item={item}
                onEdit={(target) => onEdit(item, target)}
                onRename={(name) => onRename(item, name)}
                onArchive={() => onArchive(item)}
              />
            ))}
            <button
              type="button"
              onClick={onAdd}
              className="rounded-2xl border-2 border-dashed border-line hover:border-ink text-ink-3 hover:text-ink transition flex flex-col items-center justify-center min-h-[214px] gap-2"
            >
              <span className="w-8 h-8 rounded-full border border-current flex items-center justify-center text-[20px] leading-none">
                +
              </span>
              <span className="text-[12.5px] font-medium">
                New {singularLabel.toLowerCase()}
              </span>
            </button>
          </div>
        </SortableContext>
      </DndContext>

      {showArchived && archived.length > 0 && (
        <div className="mt-2">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-3 mb-2">
            Archived
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {archived.map((item) => (
              <ArchivedCard
                key={item.id}
                item={item}
                onEdit={(target) => onEdit(item, target)}
                onUnarchive={() => onUnarchive(item)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface CardProps<T extends ReferenceView> {
  readonly item: T;
  readonly onEdit: (target?: ColorTarget) => void;
  readonly onRename: (name: string) => void;
  readonly onArchive: () => void;
}

function SortableCard<T extends ReferenceView>({
  item,
  onEdit,
  onRename,
  onArchive,
}: CardProps<T>) {
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
      className="group rounded-2xl border border-line bg-white hover:border-ink-3 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,.12)] transition overflow-hidden flex flex-col"
    >
      <div
        className="relative h-[112px] flex items-center justify-center"
        style={{ background: item.bgColor }}
      >
        <span
          className="text-[22px] font-semibold tracking-tight"
          style={{ color: item.textColor }}
        >
          {item.name}
        </span>
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition cursor-grab active:cursor-grabbing touch-none"
          aria-label={`Reorder ${item.name}`}
          style={{ color: item.textColor }}
        >
          <GripVertical size={16} />
        </button>
        <button
          type="button"
          onClick={onArchive}
          aria-label={`Archive ${item.name}`}
          title="Archive"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition rounded-md p-1 hover:bg-black/10"
          style={{ color: item.textColor }}
        >
          <Archive size={14} />
        </button>
      </div>
      <div className="p-3 flex flex-col gap-2.5">
        <input
          value={rename.value}
          onChange={rename.onChange}
          onBlur={rename.onBlur}
          onKeyDown={rename.onKeyDown}
          maxLength={64}
          className="w-full bg-transparent text-[14px] font-semibold tracking-tight px-2 -mx-2 py-1 rounded outline-none border border-transparent hover:border-line focus:border-ink focus:bg-paper-2/50 transition"
        />
        <div className="flex items-center gap-1.5">
          <ColorDot hex={item.bgColor} onClick={() => onEdit('bg')} />
          <ColorDot hex={item.textColor} onClick={() => onEdit('text')} />
        </div>
      </div>
    </div>
  );
}

function ArchivedCard<T extends ReferenceView>({
  item,
  onEdit,
  onUnarchive,
}: {
  readonly item: T;
  readonly onEdit: (target?: ColorTarget) => void;
  readonly onUnarchive: () => void;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white overflow-hidden flex flex-col opacity-60">
      <div
        className="h-[112px] flex items-center justify-center"
        style={{ background: item.bgColor }}
      >
        <span
          className="text-[22px] font-semibold tracking-tight italic"
          style={{ color: item.textColor }}
        >
          {item.name}
        </span>
      </div>
      <div className="p-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onEdit()}
          className="text-[12px] font-medium text-ink-2 hover:text-ink underline-offset-2 hover:underline"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onUnarchive}
          className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium text-ink-2 hover:text-ink hover:bg-paper-2"
        >
          <RotateCcw size={12} /> Restore
        </button>
      </div>
    </div>
  );
}

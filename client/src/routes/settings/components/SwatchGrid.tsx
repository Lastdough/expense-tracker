import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Archive, GripVertical, RotateCcw } from 'lucide-react';
import type { ReferenceView } from '../../../api/types';

interface SwatchGridProps<T extends ReferenceView> {
  readonly items: ReadonlyArray<T>;
  readonly singularLabel: string;
  readonly showArchived: boolean;
  readonly onShowArchivedChange: (next: boolean) => void;
  readonly onAdd: () => void;
  readonly onEdit: (item: T) => void;
  readonly onRename: (item: T, name: string) => void;
  readonly onArchive: (item: T) => void;
  readonly onUnarchive: (item: T) => void;
  readonly onReorder: (orderedIds: ReadonlyArray<string>) => void;
}

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
}: SwatchGridProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const active = items.filter((i) => !i.isArchived);
  const archived = items.filter((i) => i.isArchived);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active: a, over } = event;
    if (!over || a.id === over.id) return;
    const oldIndex = active.findIndex((i) => i.id === a.id);
    const newIndex = active.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(active.slice(), oldIndex, newIndex);
    onReorder(reordered.map((i) => i.id));
  };

  return (
    <div className="px-5 md:px-8 py-6 flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-2 text-[12.5px] text-ink-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => onShowArchivedChange(e.target.checked)}
            className="accent-ink"
          />
          Show archived ({archived.length})
        </label>
        <span className="ml-auto text-[11px] text-ink-3 hidden sm:block">
          Drag any card to reorder · click a swatch to change colors
        </span>
      </div>

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
                onEdit={() => onEdit(item)}
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
                onEdit={() => onEdit(item)}
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
  readonly onEdit: () => void;
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
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const [name, setName] = useState(item.name);
  const cancelRef = useRef(false);
  useEffect(() => setName(item.name), [item.name]);
  const commit = () => {
    if (cancelRef.current) {
      cancelRef.current = false;
      setName(item.name);
      return;
    }
    const trimmed = name.trim();
    if (trimmed === '' || trimmed === item.name) {
      setName(item.name);
      return;
    }
    onRename(trimmed);
  };

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
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') {
              cancelRef.current = true;
              (e.target as HTMLInputElement).blur();
            }
          }}
          maxLength={64}
          className="w-full bg-transparent text-[14px] font-semibold tracking-tight px-2 -mx-2 py-1 rounded outline-none border border-transparent hover:border-line focus:border-ink focus:bg-paper-2/50 transition"
        />
        <div className="flex items-center gap-1.5">
          <ColorDot hex={item.bgColor} onClick={onEdit} />
          <ColorDot hex={item.textColor} onClick={onEdit} />
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
  readonly onEdit: () => void;
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
          onClick={onEdit}
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

function ColorDot({ hex, onClick }: { readonly hex: string; readonly onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group/dot inline-flex items-center gap-1.5 px-1.5 py-1 rounded-md border border-line bg-white hover:border-ink-3 transition"
      title={hex}
    >
      <span
        className="w-4 h-4 rounded border border-black/10 shrink-0"
        style={{ background: hex }}
      />
      <span className="text-[10.5px] font-mono text-ink-3 group-hover/dot:text-ink uppercase">
        {hex.replace('#', '')}
      </span>
    </button>
  );
}

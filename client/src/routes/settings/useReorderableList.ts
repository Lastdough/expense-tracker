import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';

interface UseReorderableListOpts<T extends { id: string }> {
  readonly items: ReadonlyArray<T>;
  readonly onReorder: (orderedIds: ReadonlyArray<string>) => void;
}

export function useReorderableList<T extends { id: string }>({
  items,
  onReorder,
}: UseReorderableListOpts<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(items.slice(), oldIndex, newIndex);
    onReorder(reordered.map((i) => i.id));
  };

  return { sensors, handleDragEnd };
}

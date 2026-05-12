import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../../api/http';
import type {
  ChangeColorsInput,
  CreateInput,
  ReferenceView,
  RenameInput,
} from '../../api/types';

interface Api<T extends ReferenceView> {
  readonly list: (opts?: { includeArchived?: boolean }) => Promise<T[]>;
  readonly create: (input: CreateInput) => Promise<T>;
  readonly rename: (id: string, input: RenameInput) => Promise<T>;
  readonly changeColors: (id: string, input: ChangeColorsInput) => Promise<T>;
  readonly archive: (id: string) => Promise<T>;
  readonly unarchive: (id: string) => Promise<T>;
  readonly reorder: (input: { ids: ReadonlyArray<string> }) => Promise<T[]>;
}

export interface ReferenceDataResult<T extends ReferenceView> {
  readonly items: ReadonlyArray<T>;
  readonly loading: boolean;
  readonly error: string | null;
  readonly reload: () => Promise<void>;
  readonly create: (input: CreateInput) => Promise<void>;
  readonly update: (id: string, input: CreateInput) => Promise<void>;
  readonly archive: (id: string) => Promise<void>;
  readonly unarchive: (id: string) => Promise<void>;
  readonly reorder: (orderedIds: ReadonlyArray<string>) => Promise<void>;
}

function describeError(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Unexpected error';
}

export function useReferenceData<T extends ReferenceView>(
  api: Api<T>,
  onError: (msg: string) => void,
  onSuccess: (msg: string) => void,
): ReferenceDataResult<T> {
  const [items, setItems] = useState<ReadonlyArray<T>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.list({ includeArchived: true });
      setItems(list);
    } catch (e) {
      const msg = describeError(e);
      setError(msg);
      onError(msg);
    } finally {
      setLoading(false);
    }
  }, [api, onError]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(
    async (input: CreateInput) => {
      try {
        const created = await api.create(input);
        setItems((prev) => [...prev, created]);
        onSuccess(`${created.name} created`);
      } catch (e) {
        onError(describeError(e));
        throw e;
      }
    },
    [api, onError, onSuccess],
  );

  const update = useCallback(
    async (id: string, input: CreateInput) => {
      const current = items.find((i) => i.id === id);
      if (!current) return;
      try {
        let next: T = current;
        if (current.name !== input.name) {
          next = await api.rename(id, { name: input.name });
        }
        if (
          current.bgColor.toLowerCase() !== input.bgColor.toLowerCase() ||
          current.textColor.toLowerCase() !== input.textColor.toLowerCase()
        ) {
          next = await api.changeColors(id, {
            bgColor: input.bgColor,
            textColor: input.textColor,
          });
        }
        setItems((prev) => prev.map((i) => (i.id === id ? next : i)));
        onSuccess(`${next.name} saved`);
      } catch (e) {
        onError(describeError(e));
        throw e;
      }
    },
    [api, items, onError, onSuccess],
  );

  const archive = useCallback(
    async (id: string) => {
      try {
        const next = await api.archive(id);
        setItems((prev) => prev.map((i) => (i.id === id ? next : i)));
        onSuccess(`${next.name} archived`);
      } catch (e) {
        onError(describeError(e));
      }
    },
    [api, onError, onSuccess],
  );

  const unarchive = useCallback(
    async (id: string) => {
      try {
        const next = await api.unarchive(id);
        setItems((prev) => prev.map((i) => (i.id === id ? next : i)));
        onSuccess(`${next.name} restored`);
      } catch (e) {
        onError(describeError(e));
      }
    },
    [api, onError, onSuccess],
  );

  const reorder = useCallback(
    async (orderedIds: ReadonlyArray<string>) => {
      const before = items;
      const idToActive = new Map(before.filter((i) => !i.isArchived).map((i) => [i.id, i]));
      const optimistic: T[] = orderedIds.flatMap((id, idx) => {
        const item = idToActive.get(id);
        return item ? [{ ...item, displayOrder: idx + 1 }] : [];
      });
      const archived = before.filter((i) => i.isArchived);
      setItems([...optimistic, ...archived]);
      try {
        const updated = await api.reorder({ ids: orderedIds });
        const byId = new Map(updated.map((i) => [i.id, i]));
        setItems((prev) => prev.map((i) => byId.get(i.id) ?? i));
        onSuccess('Order saved');
      } catch (e) {
        setItems(before);
        onError(describeError(e));
      }
    },
    [api, items, onError, onSuccess],
  );

  return { items, loading, error, reload, create, update, archive, unarchive, reorder };
}

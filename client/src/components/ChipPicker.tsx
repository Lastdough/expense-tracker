import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { X } from 'lucide-react';

import { ApiError } from '../api/http';
import { haloColor } from '../lib/chipColors';

interface ChipPickerToken {
  readonly id: string;
  readonly name: string;
  readonly bgColor: string;
  readonly textColor: string;
  readonly isArchived?: boolean;
}

interface ChipPickerProps<T extends ChipPickerToken> {
  readonly tokens: ReadonlyArray<T>;
  // Last-used ids in priority order. Items matched here render first; the rest
  // follow in source order. Unknown ids are ignored.
  readonly order: ReadonlyArray<string>;
  readonly value: string | null;
  readonly onChange: (id: string) => void;
  // Optional inline create. When provided, a dashed "+ new" pill renders at
  // the end of the list; clicking it opens an inline input that calls onCreate
  // and auto-selects the returned token via onChange.
  readonly onCreate?: (name: string) => Promise<T>;
  readonly singular?: string;
}

// Order tokens by: last-used (in `order`) first, then remaining tokens in
// source order. Archived items are filtered out unless they're currently
// selected (so old expenses still render right).
function orderTokens<T extends ChipPickerToken>(
  tokens: ReadonlyArray<T>,
  order: ReadonlyArray<string>,
  selectedId: string | null,
): ReadonlyArray<T> {
  const visible = tokens.filter((t) => !t.isArchived || t.id === selectedId);
  const byId = new Map(visible.map((t) => [t.id, t] as const));
  const seen = new Set<string>();
  const out: T[] = [];
  for (const id of order) {
    const t = byId.get(id);
    if (t && !seen.has(t.id)) {
      out.push(t);
      seen.add(t.id);
    }
  }
  for (const t of visible) {
    if (!seen.has(t.id)) out.push(t);
  }
  return out;
}

export function ChipPicker<T extends ChipPickerToken>(props: ChipPickerProps<T>) {
  const { tokens, order, value, onChange, onCreate, singular } = props;
  const ordered = orderTokens(tokens, order, value);

  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (creating) {
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
  }, [creating]);

  const cancelCreate = () => {
    setCreating(false);
    setDraftName('');
    setCreateError(null);
  };

  const submitCreate = async () => {
    if (!onCreate) return;
    const name = draftName.trim();
    if (!name || submitting) return;
    setSubmitting(true);
    setCreateError(null);
    try {
      const created = await onCreate(name);
      onChange(created.id);
      cancelCreate();
    } catch (e) {
      setCreateError(
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Failed to create',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {ordered.map((t) => {
        const selected = t.id === value;
        const halo = selected ? haloColor(t) : undefined;
        const style: CSSProperties = {
          background: t.bgColor,
          color: t.textColor,
          padding: selected ? '2px 9px' : '3px 10px',
          borderWidth: selected ? 2 : 0,
          borderStyle: 'solid',
          borderColor: halo ?? 'transparent',
          transform: selected ? 'scale(1.10)' : 'scale(1)',
          margin: selected ? '0 4px' : '0',
          transition: 'transform 150ms ease, border-color 150ms ease',
        };
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className="rounded-full"
            style={{ padding: 0 }}
            aria-pressed={selected}
          >
            <span
              className={`inline-flex items-center rounded-full leading-tight whitespace-nowrap text-[12.5px] ${selected ? 'font-semibold' : 'font-medium'}`}
              style={style}
            >
              {t.name}
            </span>
          </button>
        );
      })}

      {onCreate && !creating && (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-full px-3 py-[5px] text-[12px] text-ink-3 border border-dashed border-line hover:border-ink hover:text-ink transition"
        >
          + new
        </button>
      )}

      {onCreate && creating && (
        <div className="inline-flex items-center gap-1 rounded-full border border-ink px-2 py-[2px] bg-white">
          <input
            ref={inputRef}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void submitCreate();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelCreate();
              }
            }}
            placeholder={singular ? `New ${singular.toLowerCase()}` : 'New name'}
            maxLength={64}
            className="text-[12.5px] min-w-[8ch] max-w-[14ch] outline-none bg-transparent"
          />
          <button
            type="button"
            onClick={() => void submitCreate()}
            disabled={submitting || draftName.trim().length === 0}
            className="text-[11px] font-semibold px-2 py-[1px] rounded-full bg-ink text-paper disabled:opacity-40"
          >
            {submitting ? '…' : 'Add'}
          </button>
          <button
            type="button"
            onClick={cancelCreate}
            className="text-ink-3 hover:text-ink p-[2px]"
            aria-label="Cancel"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {createError && (
        <span className="basis-full text-[11px] text-rose-600 mt-0.5">{createError}</span>
      )}
    </div>
  );
}

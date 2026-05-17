import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, X } from 'lucide-react';
import { ApiError } from '../api/http';
import type { ReferenceApi } from '../api/categorization';
import type { CreateInput, ReferenceView } from '../api/types';
import { Chip } from './Chip';

// Default colors for the inline "+ Add new..." path. Refinement happens in
// Settings — Quick-Add stays on a single field.
const DEFAULT_BG = '#e8eaed';
const DEFAULT_TEXT = '#000000';

export interface ReferenceSelectProps<T extends ReferenceView> {
  readonly api: ReferenceApi<T>;
  readonly label: string;
  readonly value: string | null;
  readonly onChange: (id: string) => void;
  readonly items: ReadonlyArray<T>;
  readonly onItemsChanged: (next: ReadonlyArray<T>) => void;
  readonly singular: string;
  readonly placeholder?: string;
  readonly filterArchived?: boolean;
  readonly disabled?: boolean;
  readonly autoFocus?: boolean;
  readonly id?: string;
}

export function ReferenceSelect<T extends ReferenceView>(props: ReferenceSelectProps<T>) {
  const {
    api,
    label,
    value,
    onChange,
    items,
    onItemsChanged,
    singular,
    placeholder,
    filterArchived = true,
    disabled = false,
    autoFocus = false,
    id,
  } = props;

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const newInputRef = useRef<HTMLInputElement | null>(null);

  const visible = useMemo(
    () => (filterArchived ? items.filter((i) => !i.isArchived) : items),
    [items, filterArchived],
  );
  const selected = useMemo(() => items.find((i) => i.id === value) ?? null, [items, value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('mousedown', handler);
      window.removeEventListener('keydown', esc);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setCreating(false);
      setNewName('');
      setCreateError(null);
    }
  }, [open]);

  useEffect(() => {
    if (creating) {
      const t = setTimeout(() => newInputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [creating]);

  const handleSelect = (next: T) => {
    onChange(next.id);
    setOpen(false);
  };

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setCreateError(null);
    try {
      const created = await api.create({
        name: trimmed,
        bgColor: DEFAULT_BG,
        textColor: DEFAULT_TEXT,
      } satisfies CreateInput);
      onItemsChanged([...items, created]);
      onChange(created.id);
      setOpen(false);
    } catch (e) {
      setCreateError(e instanceof ApiError ? e.message : 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          autoFocus={autoFocus}
          onClick={() => setOpen((o) => !o)}
          className={[
            'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border bg-white text-left',
            'text-[14px] outline-none transition-colors',
            'border-stone-300 hover:border-stone-400 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          ].join(' ')}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          {selected ? (
            <Chip token={selected} size="md" />
          ) : (
            <span className="text-stone-400">{placeholder ?? `Pick a ${singular.toLowerCase()}`}</span>
          )}
          <ChevronDown size={16} className="text-stone-500 shrink-0" />
        </button>

        {open && (
          <div
            ref={popoverRef}
            role="listbox"
            className={[
              'absolute z-30 mt-1.5 left-0 right-0 bg-white rounded-lg shadow-lg border border-stone-200',
              'max-h-[60vh] overflow-hidden flex flex-col',
            ].join(' ')}
          >
            <div className="overflow-y-auto flex-1">
              {visible.length === 0 && (
                <div className="px-3 py-4 text-[13px] text-stone-500 text-center">
                  No {singular.toLowerCase()} yet.
                </div>
              )}
              {visible.map((item) => {
                const isSelected = item.id === value;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(item)}
                    className={[
                      'w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-[13px]',
                      'hover:bg-stone-50 transition-colors',
                      isSelected ? 'bg-stone-50' : '',
                    ].join(' ')}
                  >
                    <Chip token={item} size="sm" />
                    {isSelected && <Check size={14} className="text-stone-700 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-stone-200 bg-stone-50/50">
              {creating ? (
                <div className="p-2 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={newInputRef}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleCreate();
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          setCreating(false);
                        }
                      }}
                      maxLength={64}
                      placeholder={`New ${singular.toLowerCase()} name`}
                      className="flex-1 px-2.5 py-1.5 rounded-md border border-stone-300 text-[13px] outline-none focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
                    />
                    <button
                      type="button"
                      onClick={() => void handleCreate()}
                      disabled={submitting || newName.trim().length === 0}
                      className="px-2.5 py-1.5 rounded-md text-[12px] font-semibold bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50"
                    >
                      {submitting ? '…' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreating(false)}
                      className="p-1.5 rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-100"
                      aria-label="Cancel"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {createError && (
                    <div className="text-[12px] text-red-700 px-1">{createError}</div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  <Plus size={14} />
                  Add new {singular.toLowerCase()}…
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

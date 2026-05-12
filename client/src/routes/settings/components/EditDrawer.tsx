import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Chip } from './Chip';

const HEX = /^#[0-9a-fA-F]{6}$/u;

export interface DrawerValues {
  readonly name: string;
  readonly bgColor: string;
  readonly textColor: string;
}

export interface EditDrawerProps {
  readonly open: boolean;
  readonly mode: 'create' | 'edit';
  readonly singularLabel: string;
  readonly initial: DrawerValues;
  readonly onClose: () => void;
  readonly onSubmit: (values: DrawerValues) => Promise<void>;
}

function isComplete(v: DrawerValues): boolean {
  return v.name.trim().length > 0 && HEX.test(v.bgColor) && HEX.test(v.textColor);
}

export function EditDrawer({
  open,
  mode,
  singularLabel,
  initial,
  onClose,
  onSubmit,
}: EditDrawerProps) {
  const [values, setValues] = useState<DrawerValues>(initial);
  const [submitting, setSubmitting] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setValues(initial);
      setSubmitting(false);
      const t = setTimeout(() => firstFieldRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const valid = isComplete(values);
  const previewToken = {
    name: values.name || singularLabel,
    bgColor: HEX.test(values.bgColor) ? values.bgColor : '#e8eaed',
    textColor: HEX.test(values.textColor) ? values.textColor : '#000000',
  };

  const submit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        name: values.name.trim(),
        bgColor: values.bgColor.toLowerCase(),
        textColor: values.textColor.toLowerCase(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-stone-900/30" onClick={onClose} />
      <div
        className={[
          'absolute bg-white shadow-2xl flex flex-col',
          'inset-x-0 bottom-0 rounded-t-2xl max-h-[88vh]',
          'md:inset-y-0 md:right-0 md:left-auto md:w-[440px] md:rounded-none md:max-h-none',
        ].join(' ')}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
              {mode === 'create' ? 'New' : 'Edit'} {singularLabel}
            </div>
            <h2 className="text-[18px] font-bold tracking-tight mt-0.5">
              {mode === 'create' ? `Add a ${singularLabel.toLowerCase()}` : values.name || singularLabel}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
          <Field label="Name">
            <input
              ref={firstFieldRef}
              type="text"
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              maxLength={64}
              placeholder={singularLabel}
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-white text-[14px] outline-none focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
            />
          </Field>

          <ColorField
            label="Background color"
            value={values.bgColor}
            onChange={(c) => setValues((v) => ({ ...v, bgColor: c }))}
          />

          <ColorField
            label="Text color"
            value={values.textColor}
            onChange={(c) => setValues((v) => ({ ...v, textColor: c }))}
          />

          <div>
            <div className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold mb-2">
              Preview
            </div>
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-4 flex flex-wrap gap-2">
              <Chip token={previewToken} size="md" />
              <Chip token={previewToken} size="lg" />
            </div>
          </div>
        </div>

        <footer className="border-t border-stone-200 px-5 py-3.5 flex gap-2 items-center">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-stone-300 text-[13px] font-semibold text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!valid || submitting}
            className="flex-[1.6] py-2.5 rounded-lg text-[13px] font-semibold text-stone-50 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving…' : mode === 'create' ? 'Create' : 'Save changes'}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
        {label}
      </span>
      {children}
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (next: string) => void;
}) {
  const valid = HEX.test(value);
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={valid ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 rounded-md border border-stone-300 bg-white cursor-pointer p-0.5"
          aria-label={`${label} swatch`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#rrggbb"
          spellCheck={false}
          maxLength={7}
          className={[
            'flex-1 px-3 py-2.5 rounded-lg border bg-white text-[13px] font-mono outline-none',
            valid
              ? 'border-stone-300 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10'
              : 'border-rose-400 focus:border-rose-600 focus:ring-2 focus:ring-rose-200',
          ].join(' ')}
        />
      </div>
      {!valid && <span className="text-[11px] text-rose-600">Must be #rrggbb hex</span>}
    </Field>
  );
}

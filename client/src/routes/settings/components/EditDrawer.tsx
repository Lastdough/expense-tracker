import {useEffect, useRef, useState} from 'react';
import {X} from 'lucide-react';
import {BlockPicker, type ColorResult} from 'react-color';
import {Chip} from './Chip';

const HEX = /^#[0-9a-fA-F]{6}$/u;

const SWATCH_PRESETS = [
  '#ffcfc9', '#ffe5a0', '#d4edbc', '#bce3f2', '#e6cff2', '#ffc8aa', '#e8eaed',
  '#fcaf23', '#ef5334', '#b10202', '#11734b', '#143361', '#000000', '#ffffff',
];

const PRESET_SET = new Set(SWATCH_PRESETS.map((c) => c.toLowerCase()));

const HISTORY_KEY = 'editDrawer:colorHistory';
const HISTORY_CAP = 8;

function readHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === 'string' && HEX.test(x))
      .map((x) => x.toLowerCase())
      .slice(0, HISTORY_CAP);
  } catch {
    return [];
  }
}

function pushHistory(current: string[], additions: string[]): string[] {
  const cleaned = additions
    .map((c) => c.toLowerCase())
    .filter((c) => HEX.test(c) && !PRESET_SET.has(c));
  if (cleaned.length === 0) return current;
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const c of [...cleaned, ...current]) {
    if (seen.has(c)) continue;
    seen.add(c);
    merged.push(c);
    if (merged.length >= HISTORY_CAP) break;
  }
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
  } catch {
    // ignore storage failures (private mode, quota)
  }
  return merged;
}

const isWhite = (c: string) => c.toLowerCase() === '#ffffff';

export interface DrawerValues {
  readonly name: string;
  readonly bgColor: string;
  readonly textColor: string;
}

type ColorTarget = 'bg' | 'text';

export interface EditDrawerProps {
  readonly open: boolean;
  readonly mode: 'create' | 'edit';
  readonly singularLabel: string;
  readonly initial: DrawerValues;
  readonly initialTarget?: ColorTarget | undefined;
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
                             initialTarget,
                             onClose,
                             onSubmit,
                           }: EditDrawerProps) {
  const [values, setValues] = useState<DrawerValues>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [activeTarget, setActiveTarget] = useState<ColorTarget>('bg');
  const [history, setHistory] = useState<string[]>(() => readHistory());
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setValues(initial);
      setSubmitting(false);
      setActiveTarget(initialTarget ?? 'bg');
      setHistory(readHistory());
      const t = setTimeout(() => firstFieldRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open, initial, initialTarget]);

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

  const activeColor = activeTarget === 'bg' ? values.bgColor : values.textColor;

  const handlePickerChange = (c: ColorResult) => {
    const hex = c.hex;
    setValues((v) => activeTarget === 'bg' ? {...v, bgColor: hex} : {...v, textColor: hex});
  };

  const applyHistory = (hex: string) => {
    setValues((v) => activeTarget === 'bg' ? {...v, bgColor: hex} : {...v, textColor: hex});
  };

  const submit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const bgColor = values.bgColor.toLowerCase();
      const textColor = values.textColor.toLowerCase();
      await onSubmit({name: values.name.trim(), bgColor, textColor});
      setHistory((h) => pushHistory(h, [bgColor, textColor]));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-stone-900/30" onClick={onClose}/>
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
            <X size={18}/>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
          <Field label="Name">
            <input
              ref={firstFieldRef}
              type="text"
              value={values.name}
              onChange={(e) => setValues((v) => ({...v, name: e.target.value}))}
              maxLength={64}
              placeholder={singularLabel}
              className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 bg-white text-[14px] outline-none focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
            />
          </Field>

          <div className="flex items-center gap-3">
            <span className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
              Preview
            </span>
            <Chip token={previewToken} size="lg"/>
          </div>

          <div>
            <div className="flex border-b border-stone-200" role="tablist" aria-label="Color target">
              <TabButton
                active={activeTarget === 'bg'}
                onClick={() => setActiveTarget('bg')}
              >
                Background
              </TabButton>
              <TabButton
                active={activeTarget === 'text'}
                onClick={() => setActiveTarget('text')}
              >
                Text
              </TabButton>
            </div>

            <div className="pt-4 flex justify-center" data-color-picker>
              <style>{`
                [data-color-picker] [title="#ffffff"] {
                  box-shadow: inset 0 0 0 1px #d6d3d1;
                }
              `}</style>
              <BlockPicker
                color={HEX.test(activeColor) ? activeColor : '#e8eaed'}
                colors={SWATCH_PRESETS}
                onChange={handlePickerChange}
                triangle="hide"
                width="100%"
                styles={{
                  default: {
                    card: {
                      boxShadow: 'none',
                      borderRadius: '8px',
                      border: '1px solid #e7e5e4',
                      width: '100%',
                    },
                    input: {
                      width: '100%',
                      boxShadow: 'inset 0 0 0 1px #d6d3d1',
                    },
                  },
                }}
              />
            </div>

            {history.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold mb-1.5">
                  Recent
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {history.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => applyHistory(hex)}
                      title={hex}
                      aria-label={`Recent color ${hex}`}
                      className={[
                        'w-[22px] h-[22px] rounded transition-transform hover:scale-110',
                        isWhite(hex) ? 'ring-1 ring-stone-300 ring-inset' : '',
                      ].join(' ')}
                      style={{background: hex}}
                    />
                  ))}
                </div>
              </div>
            )}
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

function Field({label, children}: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">
        {label}
      </span>
      {children}
    </label>
  );
}

function TabButton({
                     active,
                     onClick,
                     children,
                   }: {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        'flex-1 px-3 py-2 text-[13px] font-semibold transition-colors',
        active
          ? 'text-stone-900 border-b-2 border-stone-900 -mb-px'
          : 'text-stone-500 hover:text-stone-700 border-b-2 border-transparent -mb-px',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

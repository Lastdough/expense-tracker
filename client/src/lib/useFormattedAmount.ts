import { useLayoutEffect, useRef } from 'react';
import type { ChangeEvent, RefObject } from 'react';
import { formatAmountInput } from './money';

/**
 * Controlled amount-input helper. Live-formats the value with locale group
 * separators on every keystroke (`100000` → `100.000` for IDR) while keeping
 * the caret pointed at the same digit the user was editing.
 *
 * State holds the *displayed* value (with separators). The caller is
 * responsible for calling `extractRawAmount(value, currency)` before passing
 * the value to the formula evaluator or sending it to the server — both of
 * those expect plain decimal strings.
 *
 * Formulas (anything starting with `=`) pass through untouched: separators
 * inside an expression would change its meaning. Caret restoration is also
 * skipped in formula mode — the browser's default caret behaviour applies.
 */
export function useFormattedAmount(params: {
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly currency: string;
}): {
  readonly ref: RefObject<HTMLInputElement | null>;
  readonly onChange: (e: ChangeEvent<HTMLInputElement>) => void;
} {
  const { value, onChange, currency } = params;
  const ref = useRef<HTMLInputElement | null>(null);
  // Records the caret position we want the input to land at after React has
  // re-rendered with the formatted value. `null` means "leave the caret alone".
  const targetCaretRef = useRef<number | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const native = e.target.value;
    const nativeCaret = e.target.selectionStart ?? native.length;

    if (native.startsWith('=')) {
      // Formula mode: no reformat, no caret restore — the browser already put
      // the caret where the user expects it.
      targetCaretRef.current = null;
      onChange(native);
      return;
    }

    // How many digits are before the caret in the raw post-edit value? That's
    // the anchor we restore around: separators around it can shift, but the
    // user is editing the Nth digit and should stay there.
    const digitsBeforeCaret = native.slice(0, nativeCaret).replace(/[^\d]/g, '').length;

    const formatted = formatAmountInput(native, currency);

    // Walk the formatted string skipping non-digits until we've passed
    // `digitsBeforeCaret` digits. That's where the caret goes.
    let pos = 0;
    let seen = 0;
    while (pos < formatted.length && seen < digitsBeforeCaret) {
      if (/\d/.test(formatted[pos]!)) seen++;
      pos++;
    }
    targetCaretRef.current = pos;
    onChange(formatted);
  };

  useLayoutEffect(() => {
    const target = targetCaretRef.current;
    if (target !== null && ref.current) {
      ref.current.setSelectionRange(target, target);
    }
    targetCaretRef.current = null;
  }, [value]);

  return { ref, onChange: handleChange };
}

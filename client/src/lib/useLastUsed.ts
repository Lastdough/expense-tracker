import { useCallback, useState } from 'react';

// Per-field persistence for the Quick-Add screen and any future "remember
// what I last picked" field. Per CLAUDE.md: stable fields (category, method,
// status, date) carry between submissions; transient fields (amount,
// description) do not — those just don't use this hook.
//
// The setter is `useCallback`-stable so consumers can list it in effect deps
// without retriggering on every render.

const PREFIX = 'expense-tracker:lastUsed:';

export function useLastUsed<T>(key: string, defaultValue: T): [T, (next: T) => void] {
  const storageKey = PREFIX + key;
  const [value, setValueState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === null) return defaultValue;
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  });

  const setValue = useCallback(
    (next: T) => {
      setValueState(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* quota / privacy mode — silently degrade to session-only memory */
      }
    },
    [storageKey],
  );

  return [value, setValue];
}

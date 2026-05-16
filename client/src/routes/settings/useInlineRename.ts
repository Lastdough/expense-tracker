import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';

interface UseInlineRenameOpts {
  readonly initial: string;
  readonly onCommit: (next: string) => void;
}

interface InlineRenameHandlers {
  readonly value: string;
  readonly onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  readonly onBlur: () => void;
  readonly onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}

export function useInlineRename({ initial, onCommit }: UseInlineRenameOpts): InlineRenameHandlers {
  const [value, setValue] = useState(initial);
  const cancelRef = useRef(false);

  useEffect(() => setValue(initial), [initial]);

  const commit = () => {
    if (cancelRef.current) {
      cancelRef.current = false;
      setValue(initial);
      return;
    }
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === initial) {
      setValue(initial);
      return;
    }
    onCommit(trimmed);
  };

  return {
    value,
    onChange: (e) => setValue(e.target.value),
    onBlur: commit,
    onKeyDown: (e) => {
      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      if (e.key === 'Escape') {
        cancelRef.current = true;
        (e.target as HTMLInputElement).blur();
      }
    },
  };
}

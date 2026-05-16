interface ShowArchivedToggleProps {
  readonly checked: boolean;
  readonly onChange: (next: boolean) => void;
  readonly archivedCount: number;
  readonly hint: string;
}

export function ShowArchivedToggle({
  checked,
  onChange,
  archivedCount,
  hint,
}: ShowArchivedToggleProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <label className="flex items-center gap-2 text-[12.5px] text-ink-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="accent-ink"
        />
        Show archived ({archivedCount})
      </label>
      <span className="ml-auto text-[11px] text-ink-3 hidden sm:block">{hint}</span>
    </div>
  );
}

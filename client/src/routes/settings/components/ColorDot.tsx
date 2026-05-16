interface ColorDotProps {
  readonly hex: string;
  readonly onClick: () => void;
}

export function ColorDot({ hex, onClick }: ColorDotProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group/dot inline-flex items-center gap-1.5 px-1.5 py-1 rounded-md border border-line bg-white hover:border-ink-3 transition w-fit"
      title={hex}
    >
      <span
        className="w-4 h-4 rounded border border-black/10 shrink-0"
        style={{ background: hex }}
      />
      <span className="text-[10.5px] font-mono text-ink-3 group-hover/dot:text-ink uppercase">
        {hex.replace('#', '')}
      </span>
    </button>
  );
}

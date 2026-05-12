interface PlaceholderProps {
  readonly title: string;
  readonly milestone: string;
}

export function Placeholder({ title, milestone }: PlaceholderProps) {
  return (
    <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
      <div className="text-[11px] uppercase tracking-wider text-ink-3 font-semibold">
        Upcoming · {milestone}
      </div>
      <div className="mt-1 text-[26px] font-bold tracking-tight">{title}</div>
      <div className="mt-2 text-[13px] text-ink-3 max-w-sm leading-relaxed">
        Designed in the wireframes — implementation will land in {milestone}.
      </div>
    </div>
  );
}

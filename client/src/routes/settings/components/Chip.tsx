interface ChipToken {
  readonly name: string;
  readonly bgColor: string;
  readonly textColor: string;
}

interface ChipProps {
  readonly token: ChipToken;
  readonly label?: string;
  readonly size?: 'sm' | 'md' | 'lg';
}

export function Chip({ token, label, size = 'sm' }: ChipProps) {
  const sz =
    size === 'lg'
      ? 'text-sm px-3 py-1'
      : size === 'md'
        ? 'text-[12.5px] px-2.5 py-[3px]'
        : 'text-[11.5px] px-2 py-[2px]';
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium leading-tight whitespace-nowrap ${sz}`}
      style={{ background: token.bgColor, color: token.textColor }}
    >
      {label ?? token.name}
    </span>
  );
}

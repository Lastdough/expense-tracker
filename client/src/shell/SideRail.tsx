import { NavLink } from 'react-router-dom';
import { NAV } from './nav';

interface SideRailProps {
  readonly className?: string;
}

export function SideRail({ className = '' }: SideRailProps) {
  return (
    <aside
      className={`w-[232px] shrink-0 border-r border-line bg-paper-2 flex-col ${className}`}
    >
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center bg-ink text-paper font-bold text-[13px]">
            L
          </div>
          <div>
            <div className="text-[14px] font-bold tracking-tight">Ledger</div>
            <div className="text-[10.5px] text-ink-3 -mt-0.5">personal · IDR</div>
          </div>
        </div>
      </div>
      <nav className="px-3 flex flex-col gap-[2px]">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              [
                'group flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13px] transition',
                isActive
                  ? 'bg-ink text-paper font-semibold'
                  : 'text-ink-2 hover:bg-line/60 font-medium',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <n.icon size={15} aria-hidden />
                <span className="flex-1 text-left">{n.label}</span>
                <span
                  className={[
                    'text-[10px] font-mono px-1.5 py-px rounded border',
                    isActive
                      ? 'border-paper/30 text-paper/70'
                      : 'border-line text-ink-3 group-hover:text-ink-2',
                  ].join(' ')}
                >
                  ⌘{n.kbd}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

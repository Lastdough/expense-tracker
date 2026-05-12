import { NavLink } from 'react-router-dom';
import { NAV } from './nav';

interface BottomTabsProps {
  readonly className?: string;
}

export function BottomTabs({ className = '' }: BottomTabsProps) {
  return (
    <nav
      className={`fixed bottom-0 inset-x-0 z-20 border-t border-line bg-paper grid grid-cols-5 ${className}`}
    >
      {NAV.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          className={({ isActive }) =>
            [
              'py-2 pb-3 flex flex-col items-center gap-[3px] transition',
              isActive ? 'text-ink' : 'text-ink-3',
            ].join(' ')
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={[
                  'w-9 h-7 flex items-center justify-center rounded-full',
                  isActive ? 'bg-ink text-paper' : '',
                ].join(' ')}
              >
                <n.icon size={16} aria-hidden />
              </span>
              <span
                className={[
                  'text-[10px] tracking-wide',
                  isActive ? 'font-semibold' : 'font-medium',
                ].join(' ')}
              >
                {n.shortLabel}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

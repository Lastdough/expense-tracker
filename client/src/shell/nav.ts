import {
  BarChart3,
  Plus,
  Receipt,
  Settings,
  Upload,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  readonly to: string;
  readonly label: string;
  readonly shortLabel: string;
  readonly icon: LucideIcon;
  readonly kbd: string;
}

export const NAV: ReadonlyArray<NavItem> = [
  { to: '/quick-add', label: 'Quick Add', shortLabel: 'Add', icon: Plus, kbd: 'A' },
  { to: '/expenses', label: 'Expenses', shortLabel: 'Expenses', icon: WalletCards, kbd: 'E' },
  { to: '/dashboard', label: 'Dashboard', shortLabel: 'Insights', icon: BarChart3, kbd: 'D' },
  { to: '/receipt', label: 'Receipt', shortLabel: 'Receipt', icon: Receipt, kbd: 'R' },
  { to: '/import', label: 'Import', shortLabel: 'Import', icon: Upload, kbd: 'I' },
  { to: '/settings', label: 'Settings', shortLabel: 'Settings', icon: Settings, kbd: ',' },
];

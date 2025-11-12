import {
  BarChart3,
  ShoppingBag,
  Users,
  Settings,
  Home,
  FileText,
  UserCog,
  AlarmClock,
  MessageCircle,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { Link, useRouterState } from '@tanstack/react-router';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { to: '/', label: '儀表板', icon: Home },
  { to: '/orders', label: '交易流水', icon: ShoppingBag },
  { to: '/market-data', label: '市場數據', icon: BarChart3 },
  { to: '/users', label: '用戶', icon: Users },
  { to: '/operators', label: '操作員列表', icon: UserCog },
  { to: '/opening-settings', label: '開盤設置', icon: AlarmClock },
  { to: '/customer-service', label: '客服管理', icon: MessageCircle },
  { to: '/cms', label: 'CMS 管理', icon: FileText },
  { to: '/settings', label: '設置', icon: Settings }
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const { location } = useRouterState();
  const ToggleIcon = collapsed ? ChevronsRight : ChevronsLeft;

  return (
    <aside
      className={cn(
        'hidden xs:flex flex-shrink-0 border-r bg-card flex-col fixed left-0 top-0 h-screen z-20 pt-4 transition-all duration-200',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className={cn('flex items-center justify-between px-3 pb-4', collapsed && 'justify-center')}>
        {!collapsed && <span className="text-lg font-semibold">XT-管理後台</span>}
        <Button
          size="icon"
          variant="ghost"
          className={cn('h-8 w-8', collapsed && 'mx-auto')}
          onClick={onToggle}
          aria-label={collapsed ? '展開側邊欄' : '收合側邊欄'}
        >
          <ToggleIcon className="h-4 w-4" />
        </Button>
      </div>
      <nav className={cn('flex-1 space-y-1 overflow-y-auto px-2', collapsed && 'px-1')}>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          return (
            <Link
              to={item.to}
              key={item.to}
              className={cn(
                'flex items-center gap-2 rounded-md text-sm transition-colors',
                collapsed ? 'justify-center h-12 px-0' : 'justify-start px-3 py-2',
                isActive ? 'bg-black text-white' : 'text-muted-foreground hover:bg-accent'
              )}
              title={item.label}
            >
              <Icon className={cn('h-4 w-4 flex-shrink-0', isActive && 'text-white')} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

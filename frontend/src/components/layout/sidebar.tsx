import { BarChart3, ShoppingBag, Users, Settings, Home, FileText, UserCog } from 'lucide-react';
import { Link, useRouterState } from '@tanstack/react-router';

import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: '儀表板', icon: Home },
  { to: '/orders', label: '交易流水', icon: ShoppingBag },
  { to: '/market-data', label: '市場數據', icon: BarChart3 },
  { to: '/users', label: '用戶', icon: Users },
  { to: '/operators', label: '操作員列表', icon: UserCog },
  { to: '/cms', label: 'CMS 管理', icon: FileText },
  { to: '/settings', label: '設置', icon: Settings }
];

export const Sidebar = () => {
  const { location } = useRouterState();

  return (
    <aside className="hidden xs:flex w-16 md:w-56 flex-shrink-0 border-r bg-card flex-col fixed left-0 top-0 h-screen z-10 pt-4">
      {/* 標題：在小屏幕時隱藏，大屏幕時顯示 */}
      <div className="hidden md:block px-4 pb-4 text-lg font-semibold">CT-管理後台</div>
      <nav className="flex-1 space-y-1 px-2 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          return (
            <Link
              to={item.to}
              key={item.to}
              className={cn(
                'flex items-center justify-center md:justify-start gap-2 rounded md:rounded-md',
                'w-12 h-12 md:w-auto md:h-auto',
                'md:px-3 md:py-2 text-sm transition-colors',
                isActive ? 'bg-black text-white' : 'text-muted-foreground hover:bg-accent'
              )}
              title={item.label}
            >
              <Icon className={cn('h-4 w-4 flex-shrink-0', isActive && 'text-white')} />
              <span className="hidden md:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

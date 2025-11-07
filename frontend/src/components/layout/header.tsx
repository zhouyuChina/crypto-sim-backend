import { useState } from 'react';
import { BarChart3, ShoppingBag, Users, Settings, Home, FileText, UserCog, Menu, LogOut } from 'lucide-react';
import { Link, useRouterState } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

// 導航項目（與側邊欄和底部導航一致）
const navItems = [
  { to: '/', label: '儀表板', icon: Home },
  { to: '/orders', label: '交易流水', icon: ShoppingBag },
  { to: '/market-data', label: '市場數據', icon: BarChart3 },
  { to: '/users', label: '用戶', icon: Users },
  { to: '/operators', label: '操作員列表', icon: UserCog },
  { to: '/cms', label: 'CMS 管理', icon: FileText },
  { to: '/settings', label: '設置', icon: Settings }
];

// 路由到頁面名稱的映射
const routeToPageName: Record<string, string> = {
  '/': '儀表板',
  '/orders': '交易流水',
  '/market-data': '市場數據',
  '/users': '用戶',
  '/operators': '操作員列表',
  '/cms': 'CMS 管理',
  '/settings': '設置',
};

// 獲取當前頁面名稱
const getCurrentPageName = (pathname: string): string => {
  // 處理動態路由（如 /operators/$operatorId）
  if (pathname.startsWith('/operators/')) {
    return '操作員詳情';
  }
  return routeToPageName[pathname] || '儀表板';
};

export const Header = () => {
  const { user, logout } = useAuth();
  const { location } = useRouterState();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 將簡體中文轉換為繁體
  const convertToTraditional = (text: string): string => {
    if (!text) return text;
    return text
      .replace(/系统管理员/g, '系統管理員')
      .replace(/系统/g, '系統')
      .replace(/管理员/g, '管理員')
      .trim();
  };

  // 獲取顯示名稱（轉換簡體為繁體）
  const getDisplayName = (): string => {
    if (!user?.displayName) return '';
    return convertToTraditional(user.displayName);
  };

  const currentPageName = getCurrentPageName(location.pathname);

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3">
      {/* 大屏幕：顯示歡迎訊息 */}
      <div className="hidden xs:block">
        <h1 className="text-lg font-semibold">歡迎回來{user ? `，${getDisplayName()}` : ''}</h1>
        <p className="text-sm text-muted-foreground">監控交易活動並模擬策略。</p>
      </div>

      {/* 小屏幕（<576px）：顯示頁面名稱 */}
      <div className="xs:hidden">
        <h1 className="text-lg font-semibold">{currentPageName}</h1>
      </div>

      {/* 大屏幕：顯示登出按鈕 */}
      {user && (
        <div className="hidden xs:flex items-center gap-3 text-sm">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void logout();
            }}
          >
            退出登入
          </Button>
        </div>
      )}

      {/* 小屏幕（<576px）：顯示漢堡選單 */}
      {user && (
        <div className="xs:hidden">
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <DropdownMenuItem key={item.to} asChild>
                    <Link
                      to={item.to}
                      className={cn(
                        'flex items-center gap-2 cursor-pointer',
                        isActive && 'bg-accent'
                      )}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setIsMenuOpen(false);
                  void logout();
                }}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                退出登入
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </header>
  );
};

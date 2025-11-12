import { useState, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { Sidebar } from './sidebar';
import { Header } from './header';
import { cn } from '@/lib/utils';

export const AppShell = ({ children }: PropsWithChildren) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const containerMarginClasses = useMemo(
    () =>
      sidebarCollapsed
        ? 'xs:ml-16 md:ml-16'
        : 'xs:ml-16 md:ml-56',
    [sidebarCollapsed]
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(prev => !prev)} />
      <div className={cn('flex flex-1 flex-col overflow-hidden transition-all duration-200', containerMarginClasses)}>
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col pt-6 px-6 pb-6 bg-gray-50">{children}</main>
      </div>
    </div>
  );
};

import type { PropsWithChildren } from 'react';

import { Sidebar } from './sidebar';
import { Header } from './header';

export const AppShell = ({ children }: PropsWithChildren) => {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden xs:ml-16 md:ml-56">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col pt-6 px-6 pb-6 bg-gray-50">{children}</main>
      </div>
    </div>
  );
};

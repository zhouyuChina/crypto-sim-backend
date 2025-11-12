import {
  Outlet,
  RouterProvider,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { useMemo } from 'react';

import { AppShell } from '@/components/layout/app-shell';
import { DashboardPage } from '@/routes/dashboard';
import { LoginPage } from '@/routes/login';
import { TransactionsPage } from '@/routes/transactions';
import { MarketDataPage } from '@/routes/market-data';
import { UsersPage } from '@/routes/users';
import { UserDetailPage } from '@/routes/user-detail';
import { OperatorsPage } from '@/routes/operators';
import { OperatorDetailPage } from '@/routes/operator-detail';
import { CmsPage } from '@/routes/cms';
import { SettingsPage } from '@/routes/settings';
import { CustomerServicePage } from '@/routes/customer-service';
import { OpeningSettingsPage } from '@/routes/opening-settings';
import { useAuth } from '@/hooks/useAuth';

const rootRoute = createRootRouteWithContext<{ auth: ReturnType<typeof useAuth> }>()({
  component: () => <Outlet />
});

const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app-layout',
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' });
    }
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  )
});

const dashboardRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/',
  component: DashboardPage
});

const ordersRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/orders',
  component: TransactionsPage
});

const marketDataRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/market-data',
  component: MarketDataPage
});

const usersRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/users',
  component: UsersPage
});

const userDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/users/$userId',
  component: UserDetailPage
});

const cmsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/cms',
  component: CmsPage
});

const operatorsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/operators',
  component: OperatorsPage
});

const operatorDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/operators/$operatorId',
  component: OperatorDetailPage
});

const openingSettingsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/opening-settings',
  component: OpeningSettingsPage
});

const settingsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/settings',
  component: SettingsPage
});

const customerServiceRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/customer-service',
  component: CustomerServicePage
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/' });
    }
  },
  component: LoginPage
});

const appRoutes = appLayoutRoute.addChildren([
  dashboardRoute,
  ordersRoute,
  marketDataRoute,
  usersRoute,
  userDetailRoute,
  operatorsRoute,
  operatorDetailRoute,
  openingSettingsRoute,
  customerServiceRoute,
  cmsRoute,
  settingsRoute
]);

const routeTree = rootRoute.addChildren([appRoutes, loginRoute]);

const router = createRouter({
  routeTree,
  context: undefined as unknown as { auth: ReturnType<typeof useAuth> }
});

export const AppRouter = () => {
  const auth = useAuth();

  return (
    <>
      <RouterProvider router={router} context={{ auth }} />
      <TanStackRouterDevtools router={router} position="bottom-right" />
    </>
  );
};

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

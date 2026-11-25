import { Center } from '@chakra-ui/react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { SIGNED_OUT_PATH, useMe, wasExplicitSignOut } from '../api/auth';
import { loginPath } from '../lib/returnUrl';
import { can, type Permission } from '../lib/roles';
import { SessionContext, useSession } from '../lib/session';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ErrorBlock, LoadingBlock } from './states';

/** Gate for everything behind sign-in. Sends anonymous visitors to /login and remembers where they were going. */
export function RequireAuth() {
  const { data: me, isPending, error, refetch } = useMe();
  const location = useLocation();

  if (isPending) return <LoadingBlock fullHeight />;
  if (error) {
    return (
      <Center minH="100dvh" p="6">
        <ErrorBlock error={error} onRetry={() => void refetch()} />
      </Center>
    );
  }
  // After an explicit sign-out the login page must know, so it does not try single sign-on again by itself.
  if (!me) return <Navigate to={wasExplicitSignOut() ? SIGNED_OUT_PATH : loginPath(location.pathname + location.search)} replace />;

  return (
    <SessionContext value={me}>
      <Outlet />
    </SessionContext>
  );
}

/** Hides a route from people without the permission. The API enforces the same rule; this only tidies the UI. */
export function RequireRole({ permission }: { permission: Permission }) {
  const me = useSession();
  return can[permission](me) ? <Outlet /> : <NotFoundPage />;
}

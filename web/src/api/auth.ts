import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api, ApiError } from './client';
import { keys } from './keys';
import type { DevUser, Me, SiteConfig } from './types';

export function useSiteConfig() {
  return useQuery({
    queryKey: keys.siteConfig,
    queryFn: () => api.get<SiteConfig>('/api/site/config'),
    staleTime: 60_000,
  });
}

/** `null` means "not signed in"; `undefined` means "still loading". */
export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: async (): Promise<Me | null> => {
      try {
        return await api.get<Me>('/api/auth/me');
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 30_000,
  });
}

// Set by an explicit sign-out, cleared by the next sign-in. The route guard reads it to send the person to
// `/login?signedOut=1` instead of `/login?returnUrl=…`, so single sign-on does not sign them straight back in.
let signedOutByChoice = false;
export const SIGNED_OUT_PATH = '/login?signedOut=1';
export const wasExplicitSignOut = () => signedOutByChoice;

/**
 * Swaps the signed-in user and drops everything cached for the previous one.
 * The `auth` queries are updated in place rather than removed: removing a query that a mounted
 * component is observing leaves that component stuck on the old value.
 */
function switchUser(qc: QueryClient, me: Me | null) {
  qc.setQueryData(keys.me, me);
  qc.removeQueries({ predicate: (query) => query.queryKey[0] !== 'site' && query.queryKey[0] !== 'auth' });
}

export function useDevUsers(enabled: boolean) {
  return useQuery({
    queryKey: keys.devUsers,
    queryFn: () => api.get<DevUser[]>('/api/auth/dev-users'),
    enabled,
  });
}

export function useDevLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (employeeNo: string) => api.post<Me>('/api/auth/dev-login', { employeeNo }),
    onSuccess: (me) => {
      signedOutByChoice = false;
      switchUser(qc, me);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>('/api/auth/logout'),
    // Raised before the request: a poll that comes back 401 while the sign-out is in flight clears the
    // session first, and the route guard must already know this was the person's own choice.
    onMutate: () => {
      signedOutByChoice = true;
    },
    onError: () => {
      signedOutByChoice = false;
    },
    onSuccess: () => switchUser(qc, null),
  });
}

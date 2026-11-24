import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from './client';
import { keys } from './keys';

// Any 401 (expired cookie) drops the cached user, which makes <RequireAuth> redirect to /login.
function handleUnauthorized(error: unknown) {
  if (error instanceof ApiError && error.status === 401) {
    queryClient.setQueryData(keys.me, null);
  }
}

export const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleUnauthorized }),
  mutationCache: new MutationCache({ onError: handleUnauthorized }),
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      // 4xx answers are final; only retry network/server failures.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
    },
  },
});

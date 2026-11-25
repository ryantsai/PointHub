import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { keys, pointKeys } from './keys';
import type { CheckIn, CheckInPreview, EventSummary } from './types';

/** Open events. `q` is searched by the server (title, description, location; every word, any language). */
export function useEvents(q = '') {
  return useQuery({
    queryKey: q === '' ? keys.events : keys.eventSearch(q),
    queryFn: () => api.get<EventSummary[]>('/api/events', { q }),
    placeholderData: (previous) => previous,
  });
}

/**
 * `code` is the `k` value from a rotating QR code (null for static links); the server ignores it for static events.
 * Polls while the check-in is pending so the approval shows up without a manual refresh.
 */
export function useCheckInPreview(token: string, code: string | null) {
  return useQuery({
    queryKey: keys.checkInPreview(token, code),
    queryFn: () => api.get<CheckInPreview>(`/api/checkin/${encodeURIComponent(token)}`, { k: code }),
    refetchInterval: (query) => (query.state.data?.event.myCheckInStatus === 'pending' ? 3000 : false),
  });
}

export function useSelfCheckIn(token: string, code: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<CheckIn>(`/api/checkin/${encodeURIComponent(token)}`, undefined, { k: code }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.checkInPreview(token, code) });
      void qc.invalidateQueries({ queryKey: keys.events });
      void qc.invalidateQueries({ queryKey: keys.adminCheckIns() });
      for (const key of pointKeys) void qc.invalidateQueries({ queryKey: key });
    },
  });
}

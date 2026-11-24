import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from './client';
import { keys, pointKeys } from './keys';
import type {
  CheckIn,
  CheckInStatus,
  EventDetail,
  EventInput,
  EventStatus,
  EventSummary,
  RosterEntry,
  RosterImportResult,
  RotatingCode,
} from './types';

function refreshEvent(qc: QueryClient, id: number, detail?: EventDetail) {
  if (detail) qc.setQueryData(keys.hostEvent(id), detail);
  else void qc.invalidateQueries({ queryKey: keys.hostEvent(id) });
  void qc.invalidateQueries({ queryKey: keys.hostEvents });
  void qc.invalidateQueries({ queryKey: keys.events });
}

/** A decided check-in may have moved points, so refresh balances and ledgers too. */
function refreshAfterCheckIn(qc: QueryClient, eventId: number) {
  void qc.invalidateQueries({ queryKey: keys.hostEvent(eventId) });
  for (const key of pointKeys) void qc.invalidateQueries({ queryKey: key });
}

function storeRoster(qc: QueryClient, id: number, result: RosterImportResult) {
  qc.setQueryData(keys.roster(id), result.entries);
  void qc.invalidateQueries({ queryKey: keys.hostEvent(id), exact: true });
}

export function useHostEvents() {
  return useQuery({ queryKey: keys.hostEvents, queryFn: () => api.get<EventSummary[]>('/api/host/events') });
}

export function useHostEvent(id: number) {
  return useQuery({
    queryKey: keys.hostEvent(id),
    queryFn: () => api.get<EventDetail>(`/api/host/events/${id}`),
    refetchInterval: 5000, // keeps the pending/approved counters live while the host has the page open
  });
}

/** `id === null` creates, otherwise updates. */
export function useSaveEvent(id: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EventInput) =>
      id === null
        ? api.post<EventDetail>('/api/host/events', input)
        : api.put<EventDetail>(`/api/host/events/${id}`, input),
    onSuccess: (detail) => refreshEvent(qc, detail.id, detail),
  });
}

export function useSetEventStatus(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: EventStatus) => api.post<EventDetail>(`/api/host/events/${id}/status`, { status }),
    onSuccess: (detail) => refreshEvent(qc, id, detail),
  });
}

export function useRegenerateToken(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<EventDetail>(`/api/host/events/${id}/token`),
    onSuccess: (detail) => {
      refreshEvent(qc, id, detail);
      void qc.invalidateQueries({ queryKey: keys.checkInCode(id) });
    },
  });
}

const CODE_POLL_MAX_MS = 5000;

/**
 * Current rotating check-in code. Refetches when the code expires, and at least every few seconds regardless:
 * `expiresAt` is on the server's clock, so a station PC with a wrong clock must not sit on a stale code.
 */
export function useCheckInCode(id: number, enabled: boolean) {
  return useQuery({
    queryKey: keys.checkInCode(id),
    queryFn: () => api.get<RotatingCode>(`/api/host/events/${id}/checkin-code`),
    enabled,
    staleTime: 0,
    gcTime: 0,
    refetchInterval: (query) => {
      const code = query.state.data;
      if (!code) return 2000;
      const untilExpiry = new Date(code.expiresAt).getTime() - Date.now() + 200;
      return Math.min(Math.max(untilExpiry, 1000), CODE_POLL_MAX_MS);
    },
  });
}

export function useRoster(id: number) {
  return useQuery({
    queryKey: keys.roster(id),
    queryFn: () => api.get<RosterEntry[]>(`/api/host/events/${id}/roster`),
  });
}

export function useImportRoster(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { file: File; replace: boolean }) => {
      const form = new FormData();
      form.append('file', vars.file);
      return api.post<RosterImportResult>(`/api/host/events/${id}/roster/import`, form, { replace: vars.replace });
    },
    onSuccess: (result) => storeRoster(qc, id, result),
  });
}

export function useRematchRoster(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<RosterImportResult>(`/api/host/events/${id}/roster/rematch`),
    onSuccess: (result) => storeRoster(qc, id, result),
  });
}

export function useEventCheckIns(id: number, status: CheckInStatus | null, refetchInterval: number | false) {
  return useQuery({
    queryKey: keys.eventCheckIns(id, status),
    queryFn: () => api.get<CheckIn[]>(`/api/host/events/${id}/checkins`, { status }),
    refetchInterval,
  });
}

export function useApproveAll(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (onlyRoster: boolean) =>
      api.post<{ approved: number }>(`/api/host/events/${id}/checkins/approve-all`, { onlyRoster }),
    onSuccess: () => refreshAfterCheckIn(qc, id),
  });
}

export function useCardCheckIn(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cardUid: string) => api.post<CheckIn>(`/api/host/events/${id}/checkins/card`, { cardUid }),
    onSuccess: () => refreshAfterCheckIn(qc, id),
  });
}

export function useManualCheckIn(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (employeeNo: string) => api.post<CheckIn>(`/api/host/events/${id}/checkins/manual`, { employeeNo }),
    onSuccess: () => refreshAfterCheckIn(qc, id),
  });
}

export type CheckInDecision = { id: number; approve: true } | { id: number; approve: false; reason: string | null };

export function useDecideCheckIn(eventId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (decision: CheckInDecision) =>
      decision.approve
        ? api.post<CheckIn>(`/api/host/checkins/${decision.id}/approve`)
        : api.post<CheckIn>(`/api/host/checkins/${decision.id}/reject`, { reason: decision.reason }),
    onSettled: () => refreshAfterCheckIn(qc, eventId),
  });
}

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from './client';
import { keys, pointKeys } from './keys';
import type {
  ApiClient,
  ApiClientCreated,
  ApiClientInput,
  AuditEntry,
  Card,
  Employee,
  Paged,
  Role,
  Transaction,
  TransactionType,
} from './types';

export type TransactionFilters = {
  employeeId: number | null;
  type: TransactionType | null;
  eventId: number | null;
  q: string;
  page: number;
  pageSize: number;
};

function refreshPoints(qc: QueryClient) {
  for (const key of pointKeys) void qc.invalidateQueries({ queryKey: key });
}

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: keys.transactions(filters),
    queryFn: () => api.get<Paged<Transaction>>('/api/admin/transactions', filters),
    placeholderData: (previous) => previous,
  });
}

export function useRevertTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; reason: string }) =>
      api.post<Transaction>(`/api/admin/transactions/${vars.id}/revert`, { reason: vars.reason }),
    onSuccess: () => refreshPoints(qc),
  });
}

export function useAdjustPoints() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { employeeId: number; amount: number; reason: string }) =>
      api.post<Transaction>('/api/admin/adjustments', vars),
    onSuccess: () => refreshPoints(qc),
  });
}

export function useEmployees(q: string, page: number, pageSize: number) {
  const query = { q, page, pageSize };
  return useQuery({
    queryKey: keys.employees(query),
    queryFn: () => api.get<Paged<Employee>>('/api/admin/employees', query),
    placeholderData: (previous) => previous,
  });
}

/** An empty list makes the person a normal user. `409 last_system_admin` if nobody would be left to administer. */
export function useSetEmployeeRoles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { employeeId: number; roles: Role[] }) =>
      api.put<Employee>(`/api/admin/employees/${vars.employeeId}/roles`, { roles: vars.roles }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.employees() });
      // The admin may have changed their own roles: the session decides what the navigation shows.
      void qc.invalidateQueries({ queryKey: keys.me });
    },
  });
}

export function useRegisterCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { employeeId: number; cardUid: string; label: string | null }) =>
      api.post<Card>(`/api/admin/employees/${vars.employeeId}/cards`, { cardUid: vars.cardUid, label: vars.label }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.employees() }),
  });
}

export function useRemoveCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cardId: number) => api.delete<void>(`/api/admin/cards/${cardId}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.employees() }),
  });
}

export function useApiClients() {
  return useQuery({
    queryKey: keys.apiClients,
    queryFn: () => api.get<ApiClient[]>('/api/admin/api-clients'),
  });
}

/** The result carries the plaintext key once; keep it in component state only, never in the query cache. */
export function useCreateApiClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ApiClientInput) => api.post<ApiClientCreated>('/api/admin/api-clients', input),
    gcTime: 0,
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.apiClients }),
  });
}

export function useRevokeApiClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post<ApiClient>(`/api/admin/api-clients/${id}/revoke`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.apiClients }),
  });
}

export function useAudit(page: number, pageSize: number) {
  const query = { page, pageSize };
  return useQuery({
    queryKey: keys.audit(query),
    queryFn: () => api.get<Paged<AuditEntry>>('/api/admin/audit', query),
    placeholderData: (previous) => previous,
  });
}

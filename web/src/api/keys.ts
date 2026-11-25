import type { QueryParams } from './client';

export const keys = {
  siteConfig: ['site', 'config'] as const,
  me: ['auth', 'me'] as const,
  devUsers: ['auth', 'dev-users'] as const,
  myPoints: (q: string, page: number, pageSize: number) => ['me', 'points', q, page, pageSize] as const,
  myRedemptions: ['me', 'redemptions'] as const,
  /** The plain key is also the prefix of every searched list, so invalidating it refreshes them all. */
  events: ['events'] as const,
  eventSearch: (q: string) => ['events', q] as const,
  checkInPreview: (token: string, code: string | null = null) => ['checkin', token, code] as const,
  hostEvents: ['host', 'events'] as const,
  hostEvent: (id: number) => ['host', 'event', id] as const,
  checkInCode: (id: number) => ['host', 'event', id, 'checkin-code'] as const,
  roster: (id: number) => ['host', 'event', id, 'roster'] as const,
  pendingCheckIns: ['host', 'checkins', 'pending'] as const,
  eventCheckIns: (id: number, status: string | null) => ['host', 'event', id, 'checkins', status ?? 'all'] as const,
  gifts: ['gifts'] as const,
  giftList: (query: QueryParams) => ['gifts', query] as const,
  adminGifts: ['admin', 'gifts'] as const,
  adminStats: ['admin', 'stats'] as const,
  adminRedemptions: (query?: QueryParams) => (query ? ['admin', 'redemptions', query] : ['admin', 'redemptions']),
  transactions: (query?: QueryParams) => (query ? ['admin', 'transactions', query] : ['admin', 'transactions']),
  employees: (query?: QueryParams) => (query ? ['admin', 'employees', query] : ['admin', 'employees']),
  /** Under the `employees` prefix on purpose: whatever refreshes the list refreshes the lookup page. */
  employee: (id: number) => ['admin', 'employees', 'detail', id] as const,
  adminCheckIns: (query?: QueryParams) => (query ? ['admin', 'checkins', query] : ['admin', 'checkins']),
  audit: (query: QueryParams) => ['admin', 'audit', query] as const,
  apiClients: ['admin', 'api-clients'] as const,
  themeSettings: ['admin', 'site', 'theme'] as const,
  email: ['admin', 'email'] as const,
  emailOutbox: (query?: QueryParams) => (query ? ['admin', 'email-outbox', query] : ['admin', 'email-outbox']),
  emailPreview: (input: QueryParams) => ['admin', 'email-preview', input] as const,
};

/** Every query that shows a balance, ledger rows or point totals; invalidate these after any point movement. */
export const pointKeys: readonly (readonly string[])[] = [
  keys.me,
  ['me'],
  ['admin', 'transactions'],
  ['admin', 'employees'],
  keys.adminStats,
];

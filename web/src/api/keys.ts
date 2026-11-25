import type { QueryParams } from './client';

export const keys = {
  siteConfig: ['site', 'config'] as const,
  me: ['auth', 'me'] as const,
  devUsers: ['auth', 'dev-users'] as const,
  myPoints: (page: number, pageSize: number) => ['me', 'points', page, pageSize] as const,
  myRedemptions: ['me', 'redemptions'] as const,
  events: ['events'] as const,
  checkInPreview: (token: string, code: string | null = null) => ['checkin', token, code] as const,
  hostEvents: ['host', 'events'] as const,
  hostEvent: (id: number) => ['host', 'event', id] as const,
  checkInCode: (id: number) => ['host', 'event', id, 'checkin-code'] as const,
  roster: (id: number) => ['host', 'event', id, 'roster'] as const,
  pendingCheckIns: ['host', 'checkins', 'pending'] as const,
  eventCheckIns: (id: number, status: string | null) => ['host', 'event', id, 'checkins', status ?? 'all'] as const,
  gifts: ['gifts'] as const,
  adminGifts: ['admin', 'gifts'] as const,
  adminStats: ['admin', 'stats'] as const,
  adminRedemptions: (query?: QueryParams) => (query ? ['admin', 'redemptions', query] : ['admin', 'redemptions']),
  transactions: (query?: QueryParams) => (query ? ['admin', 'transactions', query] : ['admin', 'transactions']),
  employees: (query?: QueryParams) => (query ? ['admin', 'employees', query] : ['admin', 'employees']),
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

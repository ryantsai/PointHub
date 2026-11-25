import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import { keys } from './keys';
import type { Locale, MyPoints, Redemption } from './types';

/** `q` searches the person's own history (event title, gift name, reason); the totals are never filtered. */
export function useMyPoints(q: string, page: number, pageSize: number) {
  return useQuery({
    queryKey: keys.myPoints(q, page, pageSize),
    queryFn: () => api.get<MyPoints>('/api/me/points', { q, page, pageSize }),
    placeholderData: (previous) => previous,
  });
}

export function useMyRedemptions() {
  return useQuery({
    queryKey: keys.myRedemptions,
    queryFn: () => api.get<Redemption[]>('/api/me/redemptions'),
  });
}

export function saveMyLocale(locale: Locale) {
  return api.put<void>('/api/me/locale', { locale });
}

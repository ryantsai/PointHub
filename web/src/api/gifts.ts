import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api, uploadWithProgress } from './client';
import { keys, pointKeys } from './keys';
import type { Gift, GiftInput, Paged, Redemption, RedemptionStatus } from './types';

/** Limits of `POST /api/admin/gifts/{id}/images` (docs/api.md, "Gift images"); checked client-side before uploading. */
export const GIFT_IMAGE_LIMITS = {
  maxImages: 8,
  maxBytes: 8 * 1024 * 1024,
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
} as const;

function refreshGifts(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: keys.gifts });
  void qc.invalidateQueries({ queryKey: keys.adminGifts });
}

/** Redemptions move stock and points (balances, ledger rows, the admin dashboard numbers) and each person's own claims. */
function refreshRedemptions(qc: QueryClient) {
  refreshGifts(qc);
  void qc.invalidateQueries({ queryKey: keys.adminRedemptions() });
  for (const key of pointKeys) void qc.invalidateQueries({ queryKey: key });
}

/** The orders of the catalogue (`GET /api/gifts?sort=`); the first one is what the server does when none is asked for. */
export const GIFT_SORTS = ['popular', 'costAsc', 'costDesc', 'newest'] as const;
export type GiftSort = (typeof GIFT_SORTS)[number];

export type GiftFilters = {
  /** Name and description; every word, any language. */
  q: string;
  sort: GiftSort;
  /** Leave out gifts that are sold out. */
  inStock: boolean;
  /** Only gifts the signed-in person's balance covers. */
  affordable: boolean;
};

/**
 * The catalogue, searched, filtered and ordered by the server; without arguments, every enabled gift with the
 * most claimed first. Only what differs from that is sent, and the plain list keeps the plain key, so every
 * place that shows "all gifts" shares one request.
 */
export function useGifts(filters: Partial<GiftFilters> = {}, enabled = true) {
  const { q = '', sort = 'popular', inStock = false, affordable = false } = filters;
  const query = { q, sort: sort === 'popular' ? null : sort, inStock: inStock || null, affordable: affordable || null };
  const plain = q === '' && query.sort === null && !inStock && !affordable;
  return useQuery({
    queryKey: plain ? keys.gifts : keys.giftList(query),
    queryFn: () => api.get<Gift[]>('/api/gifts', query),
    placeholderData: (previous) => previous,
    enabled,
  });
}

export function useRedeemGift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { giftId: number; quantity: number }) =>
      api.post<Redemption>(`/api/gifts/${vars.giftId}/redeem`, { quantity: vars.quantity }),
    onSettled: () => refreshRedemptions(qc),
  });
}

export function useAdminGifts(enabled = true) {
  return useQuery({ queryKey: keys.adminGifts, queryFn: () => api.get<Gift[]>('/api/admin/gifts'), enabled });
}

/** `id === null` creates, otherwise updates (updates never change stock). */
export function useSaveGift(id: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: GiftInput) =>
      id === null ? api.post<Gift>('/api/admin/gifts', input) : api.put<Gift>(`/api/admin/gifts/${id}`, input),
    onSuccess: (gift) => {
      // A new gift is in the admin list at once, so its editor can open without waiting for the refetch.
      qc.setQueryData<Gift[]>(keys.adminGifts, (old) => old && (old.some((item) => item.id === gift.id) ? old.map((item) => (item.id === gift.id ? gift : item)) : [...old, gift]));
      refreshGifts(qc);
    },
  });
}

const GIFT_ACTIVE_KEY = ['admin', 'gift-active'] as const;

/**
 * The quick on/off switch of a gift. Optimistic: the admin list shows the new state at once and goes back to the
 * old one if the server refuses. The callbacks live on the hook, so they run for every call when several gifts
 * are switched in quick succession; the lists are refetched once the last of those calls has settled.
 */
export function useSetGiftActive() {
  const qc = useQueryClient();
  const patch = (giftId: number, isActive: boolean) =>
    qc.setQueryData<Gift[]>(keys.adminGifts, (old) => old?.map((item) => (item.id === giftId ? { ...item, isActive } : item)));
  return useMutation({
    mutationKey: GIFT_ACTIVE_KEY,
    mutationFn: (vars: { giftId: number; isActive: boolean }) => api.put<Gift>(`/api/admin/gifts/${vars.giftId}/active`, { isActive: vars.isActive }),
    onMutate: async (vars) => {
      // A refetch that is already on its way would put the old state back over the optimistic one.
      await qc.cancelQueries({ queryKey: keys.adminGifts });
      patch(vars.giftId, vars.isActive);
    },
    onError: (_error, vars) => patch(vars.giftId, !vars.isActive),
    onSettled: () => {
      if (qc.isMutating({ mutationKey: GIFT_ACTIVE_KEY }) === 1) refreshGifts(qc);
    },
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { giftId: number; delta: number; reason: string }) =>
      api.post<Gift>(`/api/admin/gifts/${vars.giftId}/stock`, { delta: vars.delta, reason: vars.reason }),
    onSuccess: () => refreshGifts(qc),
  });
}

/** Image endpoints answer with the whole gift: put it in the admin list at once and refresh the public catalog. */
function storeGift(qc: QueryClient, gift: Gift) {
  qc.setQueryData<Gift[]>(keys.adminGifts, (old) => old?.map((item) => (item.id === gift.id ? gift : item)));
  void qc.invalidateQueries({ queryKey: keys.gifts });
}

/**
 * Uploads one picture and reports progress (0–1). One file per request, so each file gets its own answer
 * (`invalid_image`, `too_many_images`) and its own progress bar.
 */
export function useUploadGiftImage(giftId: number) {
  const qc = useQueryClient();
  return async (file: File, onProgress: (fraction: number) => void): Promise<Gift> => {
    const form = new FormData();
    form.append('files', file);
    const gift = await uploadWithProgress<Gift>(`/api/admin/gifts/${giftId}/images`, form, onProgress);
    storeGift(qc, gift);
    return gift;
  };
}

export function useDeleteGiftImage(giftId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) => api.delete<Gift>(`/api/admin/gifts/${giftId}/images/${imageId}`),
    onSuccess: (gift) => storeGift(qc, gift),
  });
}

/** `imageIds`: every image of the gift, in the new display order (the first one is the cover). */
export function useReorderGiftImages(giftId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (imageIds: string[]) => api.put<Gift>(`/api/admin/gifts/${giftId}/images/order`, { imageIds }),
    onSuccess: (gift) => storeGift(qc, gift),
    onError: () => void qc.invalidateQueries({ queryKey: keys.adminGifts }),
  });
}

/** The filters of the claims list and of its CSV export (`/api/admin/redemptions/export` takes the same ones). */
export type RedemptionFilters = {
  status: RedemptionStatus | null;
  /** Employee number, name and email, gift name, cancel / refund reason. */
  q: string;
  giftId: number | null;
  employeeId: number | null;
  /** `YYYY-MM-DD`, inclusive, on the day the gift was claimed; `''` = open. */
  from: string;
  to: string;
};

/** The claims list (gift admins, system admins; auditors read-only). */
export function useAdminRedemptions(filters: RedemptionFilters, page: number, pageSize: number) {
  const query = { ...filters, page, pageSize };
  return useQuery({
    queryKey: keys.adminRedemptions(query),
    queryFn: () => api.get<Paged<Redemption>>('/api/admin/redemptions', query),
    placeholderData: (previous) => previous,
  });
}

/** How many claims match: one row is fetched and only `total` is used (tab counters, the nav badge). */
export function useRedemptionCount(filters: Pick<RedemptionFilters, 'status'> & Partial<RedemptionFilters>, enabled = true) {
  const query = { status: filters.status, q: filters.q ?? '', giftId: filters.giftId ?? null, employeeId: filters.employeeId ?? null, from: filters.from ?? '', to: filters.to ?? '', page: 1, pageSize: 1 };
  return useQuery({
    queryKey: keys.adminRedemptions(query),
    queryFn: () => api.get<Paged<Redemption>>('/api/admin/redemptions', query),
    select: (data) => data.total,
    placeholderData: (previous) => previous,
    enabled,
  });
}

export type RedemptionAction =
  | { id: number; action: 'fulfill' }
  /** Takes back a "fulfilled" mark made by mistake. */
  | { id: number; action: 'reopen' }
  /** Before the hand-over: points and stock go back. */
  | { id: number; action: 'cancel'; reason: string }
  /** After the hand-over: points go back; the items return to stock only when `restock` is set. */
  | { id: number; action: 'refund'; reason: string; restock: boolean };

export function useRedemptionAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (request: RedemptionAction) => {
      const path = `/api/admin/redemptions/${request.id}/${request.action}`;
      if (request.action === 'cancel') return api.post<Redemption>(path, { reason: request.reason });
      if (request.action === 'refund') return api.post<Redemption>(path, { reason: request.reason, restock: request.restock });
      return api.post<Redemption>(path);
    },
    onSettled: () => refreshRedemptions(qc),
  });
}

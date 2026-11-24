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

/** Redemptions move both stock and points. */
function refreshRedemptions(qc: QueryClient) {
  refreshGifts(qc);
  void qc.invalidateQueries({ queryKey: keys.adminRedemptions() });
  for (const key of pointKeys) void qc.invalidateQueries({ queryKey: key });
}

export function useGifts() {
  return useQuery({ queryKey: keys.gifts, queryFn: () => api.get<Gift[]>('/api/gifts') });
}

export function useRedeemGift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { giftId: number; quantity: number }) =>
      api.post<Redemption>(`/api/gifts/${vars.giftId}/redeem`, { quantity: vars.quantity }),
    onSettled: () => refreshRedemptions(qc),
  });
}

export function useAdminGifts() {
  return useQuery({ queryKey: keys.adminGifts, queryFn: () => api.get<Gift[]>('/api/admin/gifts') });
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

export type RedemptionFilters = {
  status: RedemptionStatus | null;
  /** Employee number or name. */
  q: string;
  giftId: number | null;
  page: number;
  pageSize: number;
};

/** The claims list (admin). */
export function useAdminRedemptions(filters: RedemptionFilters) {
  return useQuery({
    queryKey: keys.adminRedemptions(filters),
    queryFn: () => api.get<Paged<Redemption>>('/api/admin/redemptions', filters),
    placeholderData: (previous) => previous,
  });
}

/** How many claims match: one row is fetched and only `total` is used (tab counters, the nav badge). */
export function useRedemptionCount(filters: Pick<RedemptionFilters, 'status'> & Partial<Pick<RedemptionFilters, 'q' | 'giftId'>>, enabled = true) {
  const query = { status: filters.status, q: filters.q ?? '', giftId: filters.giftId ?? null, page: 1, pageSize: 1 };
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
  | { id: number; action: 'cancel'; reason: string };

export function useRedemptionAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (request: RedemptionAction) =>
      request.action === 'cancel'
        ? api.post<Redemption>(`/api/admin/redemptions/${request.id}/cancel`, { reason: request.reason })
        : api.post<Redemption>(`/api/admin/redemptions/${request.id}/${request.action}`),
    onSettled: () => refreshRedemptions(qc),
  });
}

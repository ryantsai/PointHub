import type { Gift } from '../api/types';

/** Stock at or below this is called out as running low (admin gift list, dashboard stock list). */
export const LOW_STOCK = 5;

/** The largest per-person limit the API accepts (`GiftInput.perEmployeeLimit`); above it, "No limit" is the answer. */
export const MAX_PER_EMPLOYEE_LIMIT = 1_000_000;

/**
 * How many more of this gift the per-person limit leaves the signed-in person: `null` when the gift has no limit.
 * A response without `claimedByMe` (an older server) counts as "nothing claimed yet"; the server still refuses
 * a claim over the limit with `gift_limit_reached`.
 */
export function limitLeft(gift: Gift): number | null {
  if (gift.perEmployeeLimit === null) return null;
  return Math.max(0, gift.perEmployeeLimit - (gift.claimedByMe ?? 0));
}

/** How many of this gift the person can take right now: what the limit leaves, the stock, and what the balance pays for. */
export function maxClaimable(gift: Gift, balance: number): number {
  const affordable = gift.pointCost > 0 ? Math.floor(balance / gift.pointCost) : Number.POSITIVE_INFINITY;
  return Math.max(0, Math.min(gift.stock, limitLeft(gift) ?? Number.POSITIVE_INFINITY, affordable));
}

/** The next thing worth saving for: the cheapest gift the person may still claim that the balance does not cover yet. */
export function nextGoal(gifts: Gift[] | undefined, balance: number): Gift | null {
  const ahead = (gifts ?? []).filter((gift) => gift.stock > 0 && limitLeft(gift) !== 0 && gift.pointCost > balance);
  return ahead.reduce<Gift | null>((best, gift) => (best === null || gift.pointCost < best.pointCost ? gift : best), null);
}

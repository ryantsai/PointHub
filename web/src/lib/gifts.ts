import type { Gift, Redemption } from '../api/types';

/** Stock at or below this is called out as running low (admin gift list, dashboard stock list). */
export const LOW_STOCK = 5;

/** How many more of this gift the employee may take: stock, capped by the per-person limit minus past redemptions. */
export function remainingAllowance(gift: Gift, redemptions: Redemption[] | undefined): number {
  if (gift.perEmployeeLimit === null) return gift.stock;
  const taken = (redemptions ?? [])
    .filter((r) => r.giftId === gift.id && r.status !== 'cancelled')
    .reduce((sum, r) => sum + r.quantity, 0);
  return Math.max(0, Math.min(gift.stock, gift.perEmployeeLimit - taken));
}

/** The next thing worth saving for: the cheapest gift in stock that the balance does not cover yet. */
export function nextGoal(gifts: Gift[] | undefined, balance: number): Gift | null {
  const ahead = (gifts ?? []).filter((gift) => gift.stock > 0 && gift.pointCost > balance);
  return ahead.reduce<Gift | null>((best, gift) => (best === null || gift.pointCost < best.pointCost ? gift : best), null);
}

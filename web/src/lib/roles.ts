import type { Me, Role } from '../api/types';

/** System admins implicitly hold every other role. */
function has(me: Me, role: Role): boolean {
  return me.roles.includes('systemAdmin') || me.roles.includes(role);
}

/**
 * What a signed-in person may see. The permission names are stable; only the role names behind them
 * follow the contract (systemAdmin / eventAdmin / giftAdmin / auditor).
 */
export const can = {
  /** Create and run events, approve check-ins. */
  host: (me: Me) => has(me, 'eventAdmin'),
  /** Gift catalog, stock and claims. */
  manageGifts: (me: Me) => has(me, 'giftAdmin'),
  /** Read the ledger, employees and audit log (auditors are read-only). */
  viewAdmin: (me: Me) => has(me, 'auditor'),
  /** Revert, adjust, register cards, API keys, site theme. */
  admin: (me: Me) => me.roles.includes('systemAdmin'),
};

export type Permission = keyof typeof can;

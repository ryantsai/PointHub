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

/** Does this person have a management side at all? (Any role.) */
export const hasManagement = (me: Me) => can.host(me) || can.manageGifts(me) || can.viewAdmin(me);

/**
 * Where the management side opens: the dashboard for system admins and auditors, the events list for event
 * admins, the gift catalog for gift admins. `null` for a normal employee.
 */
export function managementHome(me: Me): string | null {
  if (can.viewAdmin(me)) return '/admin';
  if (can.host(me)) return '/host/events';
  if (can.manageGifts(me)) return '/admin/gifts';
  return null;
}

/** The management side is everything under `/host` and `/admin`. */
export const isManagementPath = (pathname: string) => /^\/(host|admin)(\/|$)/.test(pathname);

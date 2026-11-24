import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import {
  events as seedEvents,
  gifts as seedGifts,
  kpis,
  ledger as seedLedger,
  me,
  myTransactions,
  pendingCheckIns,
  type EventItem,
  type Gift,
  type PendingCheckIn,
  type Transaction,
} from '@shared/data';

// One store for both views, so a redemption made as an employee shows up in the admin ledger and
// stock list, and a check-in approved by the admin lands on the employee's balance.

export type QueueItem = PendingCheckIn & { eventId?: number };

type State = {
  balance: number;
  earned: number;
  spent: number;
  gifts: Gift[];
  events: EventItem[];
  activity: Transaction[];
  pending: QueueItem[];
  ledger: Transaction[];
  issued: number;
  redeemed: number;
  outstanding: number;
  nextId: number;
  /** Ids of rows created in this session; they get the enter highlight. */
  fresh: number[];
};

type Action =
  | { type: 'redeem'; giftId: number; at: string }
  | { type: 'checkIn'; eventId: number; at: string }
  | { type: 'approve'; ids: number[]; at: string }
  | { type: 'reject'; id: number }
  | { type: 'revert'; id: number; at: string };

const initial: State = {
  balance: me.balance,
  earned: me.lifetimeEarned,
  spent: me.lifetimeSpent,
  gifts: seedGifts,
  events: seedEvents,
  activity: myTransactions,
  pending: pendingCheckIns,
  ledger: seedLedger,
  issued: kpis.pointsIssuedThisMonth,
  redeemed: kpis.pointsRedeemedThisMonth,
  outstanding: kpis.outstandingPoints,
  nextId: 9200,
  fresh: [],
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'redeem': {
      const gift = state.gifts.find((g) => g.id === action.giftId);
      if (!gift || gift.stock <= 0 || gift.pointCost > state.balance) return state;
      const tx: Transaction = {
        id: state.nextId,
        employeeNo: me.employeeNo,
        employeeName: me.displayName.en,
        amount: -gift.pointCost,
        type: 'redemption',
        title: gift.name,
        createdAt: action.at,
      };
      return {
        ...state,
        balance: state.balance - gift.pointCost,
        spent: state.spent + gift.pointCost,
        redeemed: state.redeemed + gift.pointCost,
        outstanding: state.outstanding - gift.pointCost,
        gifts: state.gifts.map((g) => (g.id === gift.id ? { ...g, stock: g.stock - 1 } : g)),
        activity: [tx, ...state.activity],
        ledger: [tx, ...state.ledger],
        nextId: state.nextId + 1,
        fresh: [...state.fresh, tx.id],
      };
    }
    case 'checkIn': {
      const event = state.events.find((e) => e.id === action.eventId);
      if (!event || event.status !== 'open' || event.myCheckIn !== 'none') return state;
      const item: QueueItem = {
        id: state.nextId,
        employeeNo: me.employeeNo,
        employeeName: me.displayName,
        department: me.department,
        eventTitle: event.title,
        points: event.points,
        onRoster: true,
        method: 'link',
        checkedInAt: action.at,
        eventId: event.id,
      };
      return {
        ...state,
        events: state.events.map((e) =>
          e.id === event.id ? { ...e, myCheckIn: 'pending', attendees: e.attendees + 1 } : e,
        ),
        pending: [...state.pending, item],
        nextId: state.nextId + 1,
      };
    }
    case 'approve': {
      const approved = state.pending.filter((p) => action.ids.includes(p.id));
      if (approved.length === 0) return state;
      const total = approved.reduce((sum, p) => sum + p.points, 0);
      let next: State = {
        ...state,
        pending: state.pending.filter((p) => !action.ids.includes(p.id)),
        issued: state.issued + total,
        outstanding: state.outstanding + total,
      };
      // Approving the employee's own check-in credits them.
      for (const mine of approved.filter((p) => p.eventId !== undefined)) {
        const tx: Transaction = {
          id: next.nextId,
          employeeNo: me.employeeNo,
          employeeName: me.displayName.en,
          amount: mine.points,
          type: 'eventAward',
          title: mine.eventTitle,
          createdAt: action.at,
        };
        next = {
          ...next,
          balance: next.balance + mine.points,
          earned: next.earned + mine.points,
          events: next.events.map((e) => (e.id === mine.eventId ? { ...e, myCheckIn: 'approved' } : e)),
          activity: [tx, ...next.activity],
          ledger: [tx, ...next.ledger],
          nextId: next.nextId + 1,
          fresh: [...next.fresh, tx.id],
        };
      }
      return next;
    }
    case 'reject': {
      const item = state.pending.find((p) => p.id === action.id);
      if (!item) return state;
      return {
        ...state,
        pending: state.pending.filter((p) => p.id !== action.id),
        events:
          item.eventId === undefined
            ? state.events
            : state.events.map((e) =>
                e.id === item.eventId ? { ...e, myCheckIn: 'none', attendees: Math.max(0, e.attendees - 1) } : e,
              ),
      };
    }
    case 'revert': {
      const row = state.ledger.find((r) => r.id === action.id);
      if (!row || row.reverted || row.type === 'reversal') return state;
      const reversal: Transaction = {
        id: state.nextId,
        employeeNo: row.employeeNo,
        employeeName: row.employeeName,
        amount: -row.amount,
        type: 'reversal',
        title: row.title,
        createdAt: action.at,
      };
      const mine = row.employeeNo === me.employeeNo;
      return {
        ...state,
        ledger: [reversal, ...state.ledger.map((r) => (r.id === row.id ? { ...r, reverted: true } : r))],
        activity: mine
          ? [reversal, ...state.activity.map((r) => (r.id === row.id ? { ...r, reverted: true } : r))]
          : state.activity,
        balance: mine ? state.balance - row.amount : state.balance,
        outstanding: state.outstanding - row.amount,
        nextId: state.nextId + 1,
        fresh: [...state.fresh, reversal.id],
      };
    }
  }
}

type Store = State & {
  redeem: (giftId: number) => void;
  checkIn: (eventId: number) => void;
  approve: (ids: number[]) => void;
  reject: (id: number) => void;
  revert: (id: number) => void;
};

const StoreContext = createContext<Store | null>(null);

const now = () => new Date().toISOString();

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const store = useMemo<Store>(
    () => ({
      ...state,
      redeem: (giftId) => dispatch({ type: 'redeem', giftId, at: now() }),
      checkIn: (eventId) => dispatch({ type: 'checkIn', eventId, at: now() }),
      approve: (ids) => dispatch({ type: 'approve', ids, at: now() }),
      reject: (id) => dispatch({ type: 'reject', id }),
      revert: (id) => dispatch({ type: 'revert', id, at: now() }),
    }),
    [state],
  );
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreProvider>');
  return store;
}

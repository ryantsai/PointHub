// Local mutations (redeem, check in, approve, revert) – plain React state seeded from the shared mock data.
// Kept above both views so a redemption on the employee side shows up in the admin ledger and stock list.
import { useReducer, type Dispatch as ReactDispatch } from 'react';
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
  type LocalizedText,
  type PendingCheckIn,
  type Transaction,
} from '@shared/data';

/** A ledger row; rows created locally keep the localized employee name so they follow the language switch. */
export type LedgerRow = Transaction & { nameL?: LocalizedText };

export type LabData = {
  balance: number;
  earned: number;
  spent: number;
  events: EventItem[];
  gifts: Gift[];
  activity: Transaction[];
  pending: PendingCheckIn[];
  ledger: LedgerRow[];
  issued: number;
  redeemed: number;
  outstanding: number;
  seq: number;
};

export type LabAction =
  | { type: 'checkIn'; eventId: number }
  | { type: 'redeem'; giftId: number; at: string }
  | { type: 'approve'; ids: number[]; at: string }
  | { type: 'reject'; id: number }
  | { type: 'revert'; txId: number; at: string };

const initial: LabData = {
  balance: me.balance,
  earned: me.lifetimeEarned,
  spent: me.lifetimeSpent,
  events: seedEvents,
  gifts: seedGifts,
  activity: myTransactions,
  pending: pendingCheckIns,
  ledger: seedLedger,
  issued: kpis.pointsIssuedThisMonth,
  redeemed: kpis.pointsRedeemedThisMonth,
  outstanding: kpis.outstandingPoints,
  seq: 9200,
};

function reducer(state: LabData, action: LabAction): LabData {
  switch (action.type) {
    case 'checkIn':
      return {
        ...state,
        events: state.events.map((e) =>
          e.id === action.eventId && e.status === 'open' && e.myCheckIn === 'none'
            ? { ...e, myCheckIn: 'pending', attendees: e.attendees + 1 }
            : e,
        ),
      };
    case 'redeem': {
      const gift = state.gifts.find((g) => g.id === action.giftId);
      if (!gift || gift.stock <= 0 || gift.pointCost > state.balance) return state;
      const tx: LedgerRow = {
        id: state.seq + 1,
        employeeNo: me.employeeNo,
        employeeName: me.displayName.en,
        nameL: me.displayName,
        amount: -gift.pointCost,
        type: 'redemption',
        title: gift.name,
        createdAt: action.at,
      };
      return {
        ...state,
        seq: state.seq + 1,
        balance: state.balance - gift.pointCost,
        spent: state.spent + gift.pointCost,
        gifts: state.gifts.map((g) => (g.id === gift.id ? { ...g, stock: g.stock - 1 } : g)),
        activity: [tx, ...state.activity],
        ledger: [tx, ...state.ledger],
        redeemed: state.redeemed + gift.pointCost,
        outstanding: state.outstanding - gift.pointCost,
      };
    }
    case 'approve': {
      const approved = state.pending.filter((p) => action.ids.includes(p.id));
      if (approved.length === 0) return state;
      const rows: LedgerRow[] = approved.map((p, i) => ({
        id: state.seq + approved.length - i,
        employeeNo: p.employeeNo,
        employeeName: p.employeeName.en,
        nameL: p.employeeName,
        amount: p.points,
        type: 'eventAward',
        title: p.eventTitle,
        createdAt: action.at,
      }));
      const total = approved.reduce((sum, p) => sum + p.points, 0);
      return {
        ...state,
        seq: state.seq + approved.length,
        pending: state.pending.filter((p) => !action.ids.includes(p.id)),
        ledger: [...rows, ...state.ledger],
        issued: state.issued + total,
        outstanding: state.outstanding + total,
      };
    }
    case 'reject':
      return { ...state, pending: state.pending.filter((p) => p.id !== action.id) };
    case 'revert': {
      const target = state.ledger.find((row) => row.id === action.txId);
      if (!target || target.reverted || target.type === 'reversal') return state;
      const reversal: LedgerRow = {
        ...target,
        id: state.seq + 1,
        amount: -target.amount,
        type: 'reversal',
        createdAt: action.at,
        reverted: false,
        source: undefined,
      };
      return {
        ...state,
        seq: state.seq + 1,
        ledger: [reversal, ...state.ledger.map((row) => (row.id === target.id ? { ...row, reverted: true } : row))],
        outstanding: state.outstanding - target.amount,
      };
    }
  }
}

export function useLabData() {
  return useReducer(reducer, initial);
}

export type Dispatch = ReactDispatch<LabAction>;

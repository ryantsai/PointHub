import { useRef, useState } from 'react';
import type { EventItem, Gift, Locale, PendingCheckIn, Transaction } from '@shared/data';
import { events, gifts, kpis, ledger, me, myTransactions, pendingCheckIns, pick } from '@shared/data';

/**
 * All local mutations for both views. It lives in <App> so the two views stay consistent:
 * redeeming a gift as an employee also shows up in the admin ledger, stock list and KPIs.
 */
export function useStore() {
  const [balance, setBalance] = useState(me.balance);
  const [lifetimeSpent, setLifetimeSpent] = useState(me.lifetimeSpent);
  const [giftList, setGiftList] = useState<Gift[]>(gifts);
  const [eventList, setEventList] = useState<EventItem[]>(events);
  const [activity, setActivity] = useState<Transaction[]>(myTransactions);
  const [pending, setPending] = useState<PendingCheckIn[]>(pendingCheckIns);
  const [ledgerRows, setLedgerRows] = useState<Transaction[]>(ledger);
  const [issued, setIssued] = useState(kpis.pointsIssuedThisMonth);
  const [redeemed, setRedeemed] = useState(kpis.pointsRedeemedThisMonth);
  const [outstanding, setOutstanding] = useState(kpis.outstandingPoints);
  /** Ledger rows created in this session; they get the enter highlight. */
  const [freshIds, setFreshIds] = useState<ReadonlySet<number>>(() => new Set());
  const nextId = useRef(9200);

  const markFresh = (ids: number[]) => setFreshIds((current) => new Set([...current, ...ids]));

  const redeem = (giftId: number): boolean => {
    const gift = giftList.find((g) => g.id === giftId);
    if (!gift || gift.stock <= 0 || gift.pointCost > balance) return false;
    const txn: Transaction = {
      id: nextId.current++,
      employeeNo: me.employeeNo,
      employeeName: me.displayName.en,
      amount: -gift.pointCost,
      type: 'redemption',
      title: gift.name,
      createdAt: new Date().toISOString(),
    };
    setBalance((value) => value - gift.pointCost);
    setLifetimeSpent((value) => value + gift.pointCost);
    setGiftList((list) => list.map((g) => (g.id === giftId ? { ...g, stock: g.stock - 1 } : g)));
    setActivity((list) => [txn, ...list]);
    setLedgerRows((list) => [txn, ...list]);
    setRedeemed((value) => value + gift.pointCost);
    setOutstanding((value) => value - gift.pointCost);
    markFresh([txn.id]);
    return true;
  };

  const checkIn = (eventId: number) => {
    setEventList((list) =>
      list.map((e) =>
        e.id === eventId && e.status === 'open' && e.myCheckIn === 'none'
          ? { ...e, myCheckIn: 'pending', attendees: e.attendees + 1 }
          : e,
      ),
    );
  };

  const approve = (ids: number[], locale: Locale) => {
    const approved = pending.filter((p) => ids.includes(p.id));
    if (approved.length === 0) return;
    const now = Date.now();
    const rows: Transaction[] = approved.map((p, index) => ({
      id: nextId.current++,
      employeeNo: p.employeeNo,
      // the ledger shows names as they are registered; reuse that spelling when we know it
      employeeName: ledgerRows.find((row) => row.employeeNo === p.employeeNo)?.employeeName ?? pick(p.employeeName, locale),
      amount: p.points,
      type: 'eventAward',
      title: p.eventTitle,
      createdAt: new Date(now - index * 1000).toISOString(),
    }));
    const total = approved.reduce((sum, p) => sum + p.points, 0);
    setPending((list) => list.filter((p) => !ids.includes(p.id)));
    setLedgerRows((list) => [...rows, ...list]);
    setIssued((value) => value + total);
    setOutstanding((value) => value + total);
    markFresh(rows.map((row) => row.id));
  };

  const reject = (id: number) => setPending((list) => list.filter((p) => p.id !== id));

  const revert = (id: number) => {
    const row = ledgerRows.find((r) => r.id === id);
    if (!row || row.reverted || row.type === 'reversal') return;
    const reversal: Transaction = {
      id: nextId.current++,
      employeeNo: row.employeeNo,
      employeeName: row.employeeName,
      amount: -row.amount,
      type: 'reversal',
      title: row.title,
      createdAt: new Date().toISOString(),
    };
    setLedgerRows((list) => [reversal, ...list.map((r) => (r.id === id ? { ...r, reverted: true } : r))]);
    setOutstanding((value) => value - row.amount);
    markFresh([reversal.id]);
  };

  return {
    balance,
    lifetimeSpent,
    gifts: giftList,
    events: eventList,
    activity,
    pending,
    ledger: ledgerRows,
    issued,
    redeemed,
    outstanding,
    freshIds,
    redeem,
    checkIn,
    approve,
    reject,
    revert,
  };
}

export type Store = ReturnType<typeof useStore>;

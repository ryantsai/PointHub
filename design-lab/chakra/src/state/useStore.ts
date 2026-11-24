// Local, in-memory state for both views, seeded from the shared mock data.
import { useCallback, useMemo, useRef, useState } from 'react';
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

export type Resolution = 'approved' | 'rejected';
export type PendingRow = PendingCheckIn & { resolution?: Resolution };

/** How long a resolved approval row shows its stamp before it leaves the queue. */
const STAMP_MS = 380;

export function useStore() {
  const [balance, setBalance] = useState(me.balance);
  const [spent, setSpent] = useState(me.lifetimeSpent);
  const [events, setEvents] = useState<EventItem[]>(seedEvents);
  const [gifts, setGifts] = useState<Gift[]>(seedGifts);
  const [activity, setActivity] = useState<Transaction[]>(myTransactions);

  const [pending, setPending] = useState<PendingRow[]>(pendingCheckIns);
  const [ledger, setLedger] = useState<Transaction[]>(seedLedger);
  const [freshLedgerIds, setFreshLedgerIds] = useState<number[]>([]);
  const [issued, setIssued] = useState(kpis.pointsIssuedThisMonth);
  const [outstanding, setOutstanding] = useState(kpis.outstandingPoints);
  const nextId = useRef(9200);
  const resolvedIds = useRef(new Set<number>());

  const redeem = useCallback(
    (gift: Gift) => {
      if (gift.stock <= 0 || gift.pointCost > balance) return;
      setBalance((v) => v - gift.pointCost);
      setSpent((v) => v + gift.pointCost);
      setGifts((list) => list.map((g) => (g.id === gift.id ? { ...g, stock: g.stock - 1 } : g)));
      setActivity((list) => [
        { id: nextId.current++, employeeNo: me.employeeNo, employeeName: me.displayName.en, amount: -gift.pointCost, type: 'redemption', title: gift.name, createdAt: new Date().toISOString() },
        ...list,
      ]);
    },
    [balance],
  );

  const checkIn = useCallback((eventId: number) => {
    setEvents((list) => list.map((e) => (e.id === eventId && e.myCheckIn === 'none' ? { ...e, myCheckIn: 'pending', attendees: e.attendees + 1 } : e)));
  }, []);

  const resolve = useCallback((ids: number[], resolution: Resolution) => {
    setPending((list) => list.map((row) => (ids.includes(row.id) && !row.resolution ? { ...row, resolution } : row)));
    window.setTimeout(() => setPending((list) => list.filter((row) => !ids.includes(row.id))), STAMP_MS);
  }, []);

  const approve = useCallback(
    (row: PendingRow) => {
      if (resolvedIds.current.has(row.id)) return;
      resolvedIds.current.add(row.id);
      resolve([row.id], 'approved');
      setIssued((v) => v + row.points);
      setOutstanding((v) => v + row.points);
    },
    [resolve],
  );

  const reject = useCallback(
    (row: PendingRow) => {
      if (resolvedIds.current.has(row.id)) return;
      resolvedIds.current.add(row.id);
      resolve([row.id], 'rejected');
    },
    [resolve],
  );

  const approveAll = useCallback(() => {
    // Cascade down the queue so the rows leave one after another rather than as a block.
    pending
      .filter((row) => !row.resolution)
      .forEach((row, i) => window.setTimeout(() => approve(row), i * 90));
  }, [pending, approve]);

  const revert = useCallback((tx: Transaction) => {
    if (tx.reverted || tx.type === 'reversal') return;
    const id = nextId.current++;
    setLedger((list) => [
      { id, employeeNo: tx.employeeNo, employeeName: tx.employeeName, amount: -tx.amount, type: 'reversal', title: tx.title, createdAt: new Date().toISOString() },
      ...list.map((row) => (row.id === tx.id ? { ...row, reverted: true } : row)),
    ]);
    setFreshLedgerIds((ids) => [...ids, id]);
  }, []);

  const pendingCount = pending.filter((row) => !row.resolution).length;

  return useMemo(
    () => ({
      balance, spent, earned: me.lifetimeEarned, events, gifts, activity, redeem, checkIn,
      pending, pendingCount, ledger, freshLedgerIds, issued, outstanding, approve, reject, approveAll, revert,
    }),
    [balance, spent, events, gifts, activity, redeem, checkIn, pending, pendingCount, ledger, freshLedgerIds, issued, outstanding, approve, reject, approveAll, revert],
  );
}

export type Store = ReturnType<typeof useStore>;

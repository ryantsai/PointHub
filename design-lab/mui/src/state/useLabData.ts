// Local, in-memory mutations seeded from the shared mock data. Lives above both views so a redeem
// in the employee view is visible in the admin ledger, stock list and KPIs after switching.
import { useCallback, useMemo, useRef, useState } from 'react';
import { events as seedEvents, gifts as seedGifts, kpis as seedKpis, ledger as seedLedger, me, myTransactions, pendingCheckIns, pick } from '@shared/data';
import type { EventItem, Gift, Locale, PendingCheckIn, Transaction } from '@shared/data';

export type LabData = ReturnType<typeof useLabData>;

export function useLabData() {
  const nextId = useRef(9200);
  const [balance, setBalance] = useState(me.balance);
  const [spent, setSpent] = useState(me.lifetimeSpent);
  const [gifts, setGifts] = useState<Gift[]>(seedGifts);
  const [events, setEvents] = useState<EventItem[]>(seedEvents);
  const [activity, setActivity] = useState<Transaction[]>(myTransactions);
  const [pending, setPending] = useState<PendingCheckIn[]>(pendingCheckIns);
  const [ledger, setLedger] = useState<Transaction[]>(seedLedger);
  const [issued, setIssued] = useState(seedKpis.pointsIssuedThisMonth);
  const [redeemed, setRedeemed] = useState(seedKpis.pointsRedeemedThisMonth);
  const [outstanding, setOutstanding] = useState(seedKpis.outstandingPoints);
  /** Ids of rows created in this session: they get the "new row" highlight. */
  const [fresh, setFresh] = useState<ReadonlySet<number>>(new Set());

  const newId = useCallback(() => {
    nextId.current += 1;
    return nextId.current;
  }, []);
  const markFresh = useCallback((ids: number[]) => setFresh((prev) => new Set([...prev, ...ids])), []);

  const redeem = useCallback(
    (gift: Gift) => {
      const tx: Transaction = {
        id: newId(),
        employeeNo: me.employeeNo,
        employeeName: me.displayName.en,
        amount: -gift.pointCost,
        type: 'redemption',
        title: gift.name,
        createdAt: new Date().toISOString(),
      };
      setBalance((b) => b - gift.pointCost);
      setSpent((s) => s + gift.pointCost);
      setGifts((list) => list.map((g) => (g.id === gift.id ? { ...g, stock: Math.max(0, g.stock - 1) } : g)));
      setActivity((list) => [tx, ...list]);
      setLedger((list) => [tx, ...list]);
      setRedeemed((v) => v + gift.pointCost);
      setOutstanding((v) => v - gift.pointCost);
      markFresh([tx.id]);
    },
    [markFresh, newId],
  );

  const checkInToEvent = useCallback((eventId: number) => {
    setEvents((list) => list.map((e) => (e.id === eventId && e.myCheckIn === 'none' ? { ...e, myCheckIn: 'pending', attendees: e.attendees + 1 } : e)));
  }, []);

  const award = useCallback(
    (rows: PendingCheckIn[], locale: Locale) => {
      const now = new Date().toISOString();
      const txs: Transaction[] = rows.map((row) => ({
        id: newId(),
        employeeNo: row.employeeNo,
        employeeName: pick(row.employeeName, locale),
        amount: row.points,
        type: 'eventAward',
        title: row.eventTitle,
        createdAt: now,
      }));
      const total = rows.reduce((sum, row) => sum + row.points, 0);
      setLedger((list) => [...txs.slice().reverse(), ...list]);
      setIssued((v) => v + total);
      setOutstanding((v) => v + total);
      markFresh(txs.map((tx) => tx.id));
    },
    [markFresh, newId],
  );

  const approve = useCallback(
    (row: PendingCheckIn, locale: Locale) => {
      setPending((list) => list.filter((p) => p.id !== row.id));
      award([row], locale);
    },
    [award],
  );

  const reject = useCallback((row: PendingCheckIn) => {
    setPending((list) => list.filter((p) => p.id !== row.id));
  }, []);

  const approveAll = useCallback(
    (rows: PendingCheckIn[], locale: Locale) => {
      setPending([]);
      award(rows, locale);
    },
    [award],
  );

  const revert = useCallback(
    (tx: Transaction) => {
      const reversal: Transaction = {
        id: newId(),
        employeeNo: tx.employeeNo,
        employeeName: tx.employeeName,
        amount: -tx.amount,
        type: 'reversal',
        title: tx.title,
        createdAt: new Date().toISOString(),
      };
      setLedger((list) => [reversal, ...list.map((row) => (row.id === tx.id ? { ...row, reverted: true } : row))]);
      setOutstanding((v) => v - tx.amount);
      markFresh([reversal.id]);
    },
    [markFresh, newId],
  );

  return useMemo(
    () => ({
      balance, spent, earned: me.lifetimeEarned, gifts, events, activity, pending, ledger, issued, redeemed, outstanding, fresh,
      redeem, checkInToEvent, approve, reject, approveAll, revert,
    }),
    [balance, spent, gifts, events, activity, pending, ledger, issued, redeemed, outstanding, fresh, redeem, checkInToEvent, approve, reject, approveAll, revert],
  );
}

// Local, in-memory mutations seeded from the shared mock data. Both stores live above the view
// switch so going Employee → Admin → Employee keeps what you did.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type EventItem,
  events as seedEvents,
  type Gift,
  gifts as seedGifts,
  kpis as seedKpis,
  ledger as seedLedger,
  type Locale,
  me,
  myTransactions,
  type PendingCheckIn,
  pendingCheckIns,
  pick,
  type Transaction,
} from '@shared/data';

let nextId = 9200;

export function useEmployeeStore() {
  const [balance, setBalance] = useState(me.balance);
  const [spent, setSpent] = useState(me.lifetimeSpent);
  const [events, setEvents] = useState<EventItem[]>(seedEvents);
  const [gifts, setGifts] = useState<Gift[]>(seedGifts);
  const [activity, setActivity] = useState<Transaction[]>(myTransactions);

  const checkIn = useCallback((eventId: number) => {
    setEvents((list) =>
      list.map((e) => (e.id === eventId && e.status === 'open' && e.myCheckIn === 'none' ? { ...e, myCheckIn: 'pending', attendees: e.attendees + 1 } : e)),
    );
  }, []);

  const redeem = useCallback(
    (gift: Gift) => {
      if (gift.stock <= 0 || gift.pointCost > balance) return;
      setBalance((b) => b - gift.pointCost);
      setSpent((s) => s + gift.pointCost);
      setGifts((list) => list.map((g) => (g.id === gift.id ? { ...g, stock: g.stock - 1 } : g)));
      const id = nextId++;
      setActivity((list) => [
        {
          id,
          employeeNo: me.employeeNo,
          employeeName: me.displayName.en,
          amount: -gift.pointCost,
          type: 'redemption',
          title: gift.name,
          createdAt: new Date().toISOString(),
        },
        ...list,
      ]);
    },
    [balance],
  );

  return { balance, spent, earned: me.lifetimeEarned, events, gifts, activity, checkIn, redeem };
}

export type EmployeeStore = ReturnType<typeof useEmployeeStore>;

export function useAdminStore() {
  const [pending, setPending] = useState<PendingCheckIn[]>(pendingCheckIns);
  const [ledger, setLedger] = useState<Transaction[]>(seedLedger);
  const [issued, setIssued] = useState(seedKpis.pointsIssuedThisMonth);
  const [outstanding, setOutstanding] = useState(seedKpis.outstandingPoints);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const ledgerRef = useRef(ledger);
  ledgerRef.current = ledger;
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  /** Approving awards the points: the queue row leaves, the KPIs move and the award lands in the ledger. */
  const approve = useCallback((id: number, locale: Locale) => {
    const item = pendingRef.current.find((p) => p.id === id);
    if (!item) return;
    pendingRef.current = pendingRef.current.filter((p) => p.id !== id);
    setPending((list) => list.filter((p) => p.id !== id));
    setIssued((v) => v + item.points);
    setOutstanding((v) => v + item.points);
    const rowId = nextId++;
    setLedger((list) => [
      {
        id: rowId,
        employeeNo: item.employeeNo,
        employeeName: pick(item.employeeName, locale),
        amount: item.points,
        type: 'eventAward',
        title: item.eventTitle,
        createdAt: new Date().toISOString(),
      },
      ...list,
    ]);
  }, []);

  const reject = useCallback((id: number) => {
    pendingRef.current = pendingRef.current.filter((p) => p.id !== id);
    setPending((list) => list.filter((p) => p.id !== id));
  }, []);

  /** Clears the queue one row at a time so the exit animation cascades and the KPI counts down. */
  const approveAll = useCallback(
    (locale: Locale) => {
      pendingRef.current.forEach((item, index) => {
        timers.current.push(window.setTimeout(() => approve(item.id, locale), index * 90));
      });
    },
    [approve],
  );

  const revert = useCallback((id: number) => {
    const target = ledgerRef.current.find((row) => row.id === id);
    if (!target || target.reverted || target.type === 'reversal') return;
    const reversal: Transaction = {
      id: nextId++,
      employeeNo: target.employeeNo,
      employeeName: target.employeeName,
      amount: -target.amount,
      type: 'reversal',
      title: target.title,
      createdAt: new Date().toISOString(),
    };
    const mark = (list: Transaction[]) => [reversal, ...list.map((row) => (row.id === id ? { ...row, reverted: true } : row))];
    ledgerRef.current = mark(ledgerRef.current); // guards a double click before the next render
    setLedger(mark);
    setOutstanding((v) => v - target.amount);
  }, []);

  return {
    pending,
    ledger,
    issued,
    outstanding,
    redeemed: seedKpis.pointsRedeemedThisMonth,
    approve,
    reject,
    approveAll,
    revert,
  };
}

export type AdminStore = ReturnType<typeof useAdminStore>;

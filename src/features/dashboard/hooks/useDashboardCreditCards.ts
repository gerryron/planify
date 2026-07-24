'use client';

import { useMemo } from 'react';
import type { CashLog } from '@/features/cash-log/services/cashLogService';
import type { Wallets } from '@/features/wallets/services/walletsService';
import {
  shortMonthLabel,
  toIsoDate,
  getDateWithSafeDay,
  getNextDueDate,
  getCycleWindow,
} from '../utils/dashboardCharts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CreditCardDueReminder = {
  id: number;
  name: string;
  dueDate: string;
  days: number;
  outstanding: number;
  severity: 'overdue' | 'due-soon' | 'upcoming';
};

type CreditCardCycleSummary = {
  id: number;
  name: string;
  cycleStart: string;
  cycleEnd: string;
  dueDate: string;
  spent: number;
  paid: number;
  netChange: number;
  outstanding: number;
  creditLimit: number;
  remainingLimit: number;
  utilization: number;
};

type CreditCardMonthMetric = {
  month: string;
  label: string;
  billed: number;
  paid: number;
  carryover: number;
  cycleUtilization: number;
  paymentCoverage: number;
  onTrack: boolean;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDashboardCreditCards(
  wallets: Wallets[],
  cashLogs: CashLog[],
  selectedWallet: Wallets | null,
  selectedMonth: string,
  trendMonths: {
    month: string;
    label: string;
    income: number;
    outcome: number;
    net: number;
  }[],
) {
  const creditCardWallets = useMemo(
    () =>
      wallets.filter(
        (wallet) =>
          wallet.walletKind === 'credit_card' &&
          (!selectedWallet || wallet.id === selectedWallet.id),
      ),
    [wallets, selectedWallet],
  );

  const creditCardDueReminders = useMemo<CreditCardDueReminder[]>(() => {
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);

    return creditCardWallets
      .filter(
        (wallet) =>
          wallet.balance > 0 &&
          Number.isInteger(wallet.dueDay) &&
          Number(wallet.dueDay) > 0,
      )
      .map((wallet) => {
        const dueDay = Number(wallet.dueDay);
        const thisMonthDue = getDateWithSafeDay(
          baseDate.getFullYear(),
          baseDate.getMonth(),
          dueDay,
        );

        if (baseDate > thisMonthDue) {
          const overdueDays = Math.floor(
            (baseDate.getTime() - thisMonthDue.getTime()) / 86_400_000,
          );
          return {
            id: wallet.id,
            name: wallet.name,
            dueDate: toIsoDate(thisMonthDue),
            days: -overdueDays,
            outstanding: wallet.balance,
            severity: 'overdue' as const,
          };
        }

        const nextDueDate = getNextDueDate(baseDate, dueDay);
        const daysUntilDue = Math.floor(
          (nextDueDate.getTime() - baseDate.getTime()) / 86_400_000,
        );
        const severity: CreditCardDueReminder['severity'] =
          daysUntilDue <= 5 ? 'due-soon' : 'upcoming';

        return {
          id: wallet.id,
          name: wallet.name,
          dueDate: toIsoDate(nextDueDate),
          days: daysUntilDue,
          outstanding: wallet.balance,
          severity,
        };
      })
      .sort((a, b) => a.days - b.days);
  }, [creditCardWallets]);

  const creditCardCycleSummaries = useMemo<CreditCardCycleSummary[]>(() => {
    return creditCardWallets
      .filter(
        (wallet) =>
          Number.isInteger(wallet.statementDay) &&
          Number.isInteger(wallet.dueDay) &&
          Number(wallet.statementDay) > 0 &&
          Number(wallet.dueDay) > 0 &&
          Number(wallet.creditLimit) > 0,
      )
      .map((wallet) => {
        const cycleWindow = getCycleWindow(selectedMonth, Number(wallet.statementDay));
        const dueDate = getDateWithSafeDay(
          cycleWindow.cycleEndDate.getFullYear(),
          cycleWindow.cycleEndDate.getMonth() + 1,
          Number(wallet.dueDay),
        );

        const cycleLogs = cashLogs.filter(
          (log) =>
            log.walletName === wallet.name &&
            !log.excludeFromReport &&
            log.date >= cycleWindow.cycleStart &&
            log.date <= cycleWindow.cycleEnd,
        );

        const paymentLogs = cashLogs.filter(
          (log) =>
            log.walletName === wallet.name &&
            !log.excludeFromReport &&
            log.date >= cycleWindow.cycleEnd &&
            log.date <= toIsoDate(dueDate),
        );

        const spent = cycleLogs
          .filter((log) => log.category?.type === 'outcome')
          .reduce((sum, log) => sum + log.amount, 0);
        const paid = paymentLogs
          .filter((log) => log.category?.type === 'income')
          .reduce((sum, log) => sum + log.amount, 0);
        const netChange = spent - paid;
        const creditLimit = Number(wallet.creditLimit);
        const remainingLimit = Math.max(creditLimit - wallet.balance, 0);
        const utilization =
          creditLimit > 0
            ? Math.min((wallet.balance / creditLimit) * 100, 100)
            : 0;

        return {
          id: wallet.id,
          name: wallet.name,
          cycleStart: cycleWindow.cycleStart,
          cycleEnd: cycleWindow.cycleEnd,
          dueDate: toIsoDate(dueDate),
          spent,
          paid,
          netChange,
          outstanding: wallet.balance,
          creditLimit,
          remainingLimit,
          utilization,
        };
      })
      .sort((a, b) => b.outstanding - a.outstanding);
  }, [cashLogs, creditCardWallets, selectedMonth]);

  const creditCardMonths6 = useMemo<CreditCardMonthMetric[]>(() => {
    const eligibleCards = wallets.filter(
      (wallet) =>
        wallet.walletKind === 'credit_card' &&
        (!selectedWallet || wallet.id === selectedWallet.id) &&
        Number.isInteger(wallet.statementDay) &&
        Number.isInteger(wallet.dueDay) &&
        Number(wallet.statementDay) > 0 &&
        Number(wallet.dueDay) > 0 &&
        Number(wallet.creditLimit) > 0,
    );

    return trendMonths.map(({ month }) => {
      const totals = eligibleCards.reduce(
        (acc, wallet) => {
          const cycleWindow = getCycleWindow(month, Number(wallet.statementDay));
          const dueDate = getDateWithSafeDay(
            cycleWindow.cycleEndDate.getFullYear(),
            cycleWindow.cycleEndDate.getMonth() + 1,
            Number(wallet.dueDay),
          );
          const dueDateIso = toIsoDate(dueDate);

          const cycleLogs = cashLogs.filter(
            (log) =>
              log.walletName === wallet.name &&
              !log.excludeFromReport &&
              log.date >= cycleWindow.cycleStart &&
              log.date <= cycleWindow.cycleEnd,
          );

          const paymentLogs = cashLogs.filter(
            (log) =>
              log.walletName === wallet.name &&
              !log.excludeFromReport &&
              log.date >= cycleWindow.cycleEnd &&
              log.date <= dueDateIso,
          );

          const billed = cycleLogs
            .filter((log) => log.category?.type === 'outcome')
            .reduce((sum, log) => sum + log.amount, 0);
          const paid = paymentLogs
            .filter((log) => log.category?.type === 'income')
            .reduce((sum, log) => sum + log.amount, 0);

          acc.billed += billed;
          acc.paid += paid;
          acc.limit += Number(wallet.creditLimit);
          return acc;
        },
        { billed: 0, paid: 0, limit: 0 },
      );

      const carryover = Math.max(totals.billed - totals.paid, 0);
      const cycleUtilization =
        totals.limit > 0
          ? Math.min((totals.billed / totals.limit) * 100, 100)
          : 0;
      const paymentCoverage =
        totals.billed > 0
          ? Math.min((totals.paid / totals.billed) * 100, 999)
          : 100;

      return {
        month,
        label: shortMonthLabel(month),
        billed: totals.billed,
        paid: totals.paid,
        carryover,
        cycleUtilization,
        paymentCoverage,
        onTrack: totals.billed > 0 && totals.paid >= totals.billed,
      };
    });
  }, [cashLogs, selectedWallet, trendMonths, wallets]);

  const paymentDisciplineSummary = useMemo(() => {
    const activeMonths = creditCardMonths6.filter(
      (item) => item.billed > 0 || item.paid > 0,
    );
    const onTrackMonths = activeMonths.filter((item) => item.onTrack).length;
    const atRiskMonths = activeMonths.filter((item) => item.carryover > 0).length;
    const totalBilled = activeMonths.reduce((sum, item) => sum + item.billed, 0);
    const totalPaid = activeMonths.reduce((sum, item) => sum + item.paid, 0);
    const avgCoverage =
      totalBilled > 0 ? Math.min((totalPaid / totalBilled) * 100, 999) : 100;

    return {
      activeMonths: activeMonths.length,
      onTrackMonths,
      atRiskMonths,
      avgCoverage,
      totalBilled,
      totalPaid,
    };
  }, [creditCardMonths6]);

  const balanceTrend = useMemo(() => {
    const result: Array<(typeof trendMonths)[number] & { balance: number }> = [];
    let acc = 0;
    for (const m of trendMonths) {
      acc += m.net;
      result.push({ ...m, balance: acc });
    }
    return result;
  }, [trendMonths]);

  return {
    creditCardWallets,
    creditCardDueReminders,
    creditCardCycleSummaries,
    creditCardMonths6,
    paymentDisciplineSummary,
    balanceTrend,
  };
}

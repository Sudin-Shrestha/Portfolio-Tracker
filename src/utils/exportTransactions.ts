import { saveAs } from 'file-saver';
import { Transaction } from '../types';

export type MonthKey = string; // 'YYYY-MM' or 'all'

export interface MonthOption {
  key: MonthKey;
  label: string;
}

export type ExportFormat = 'ai' | 'csv' | 'json';

const monthLongLabel = (key: string) => {
  const d = new Date(key + '-01T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

export const listAvailableMonths = (transactions: Transaction[]): MonthOption[] => {
  const set = new Set<string>();
  transactions.forEach((t) => set.add(t.date.substring(0, 7)));
  const months = Array.from(set)
    .sort()
    .reverse()
    .map((key) => ({ key, label: monthLongLabel(key) }));
  return [{ key: 'all', label: 'All time' }, ...months];
};

export const filterByMonth = (
  transactions: Transaction[],
  monthKey: MonthKey,
): Transaction[] => {
  if (monthKey === 'all') return transactions;
  return transactions.filter((t) => t.date.substring(0, 7) === monthKey);
};

export const periodLabel = (monthKey: MonthKey): string =>
  monthKey === 'all' ? 'All time' : monthLongLabel(monthKey);

interface PeriodStats {
  income: number;
  expense: number;
  net: number;
  savingsRate: number;
  txCount: number;
  incomeCount: number;
  expenseCount: number;
  byCategory: { name: string; total: number; count: number; pct: number }[];
  topExpenseDay: { date: string; total: number } | null;
}

const buildStats = (transactions: Transaction[]): PeriodStats => {
  let income = 0;
  let expense = 0;
  let incomeCount = 0;
  let expenseCount = 0;
  const categoryMap: Record<string, { total: number; count: number }> = {};
  const dayMap: Record<string, number> = {};

  transactions.forEach((t) => {
    if (t.type === 'income') {
      income += t.amount;
      incomeCount += 1;
    } else {
      expense += t.amount;
      expenseCount += 1;
      const c = categoryMap[t.category] || { total: 0, count: 0 };
      c.total += t.amount;
      c.count += 1;
      categoryMap[t.category] = c;
      dayMap[t.date] = (dayMap[t.date] || 0) + t.amount;
    }
  });

  const byCategory = Object.keys(categoryMap)
    .map((name) => ({
      name,
      total: categoryMap[name].total,
      count: categoryMap[name].count,
      pct: expense > 0 ? (categoryMap[name].total / expense) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  let topExpenseDay: { date: string; total: number } | null = null;
  Object.keys(dayMap).forEach((date) => {
    if (!topExpenseDay || dayMap[date] > topExpenseDay.total) {
      topExpenseDay = { date, total: dayMap[date] };
    }
  });

  return {
    income,
    expense,
    net: income - expense,
    savingsRate: income > 0 ? ((income - expense) / income) * 100 : 0,
    txCount: transactions.length,
    incomeCount,
    expenseCount,
    byCategory,
    topExpenseDay,
  };
};

const money = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const buildAiReviewMarkdown = (
  transactions: Transaction[],
  monthKey: MonthKey,
): string => {
  const period = periodLabel(monthKey);
  const rows = filterByMonth(transactions, monthKey).slice().sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const stats = buildStats(rows);
  const generatedAt = new Date().toISOString();

  const lines: string[] = [];
  lines.push('# Personal Finance Review Request');
  lines.push('');
  lines.push(
    'You are acting as a personal finance analyst. Review the data below and provide:',
  );
  lines.push(
    '1. A concise health-check (savings rate, income vs. expense balance, anomalies).',
  );
  lines.push('2. The top 3 categories I overspent on, with reasoning.');
  lines.push('3. Specific, realistic suggestions to cut expenses next month.');
  lines.push('4. Any recurring patterns (subscriptions, bills) worth optimizing.');
  lines.push('5. A short summary verdict (1–2 sentences).');
  lines.push('');
  lines.push(`**Period:** ${period}`);
  lines.push(`**Generated:** ${generatedAt}`);
  lines.push(`**Currency:** assumed consistent across all rows`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  lines.push(`| Total income | $${money(stats.income)} (${stats.incomeCount} entries) |`);
  lines.push(`| Total expense | $${money(stats.expense)} (${stats.expenseCount} entries) |`);
  lines.push(
    `| Net savings | ${stats.net < 0 ? '-' : ''}$${money(Math.abs(stats.net))} |`,
  );
  lines.push(`| Savings rate | ${stats.savingsRate.toFixed(1)}% |`);
  lines.push(`| Transactions | ${stats.txCount} |`);
  if (stats.topExpenseDay) {
    lines.push(
      `| Highest-spend day | ${stats.topExpenseDay.date} ($${money(stats.topExpenseDay.total)}) |`,
    );
  }
  lines.push('');

  if (stats.byCategory.length > 0) {
    lines.push('## Expense breakdown by category');
    lines.push('');
    lines.push('| Category | Total | Count | % of expense |');
    lines.push('| --- | --- | --- | --- |');
    stats.byCategory.forEach((c) => {
      lines.push(`| ${c.name} | $${money(c.total)} | ${c.count} | ${c.pct.toFixed(1)}% |`);
    });
    lines.push('');
  }

  lines.push('## Transactions');
  lines.push('');
  if (rows.length === 0) {
    lines.push('_No transactions in this period._');
  } else {
    lines.push('| Date | Type | Category | Description | Amount | Notes |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    rows.forEach((t) => {
      const sign = t.type === 'expense' ? '-' : '+';
      const notes = (t.notes || '').replace(/\|/g, '/').replace(/\n/g, ' ');
      const desc = t.description.replace(/\|/g, '/');
      lines.push(
        `| ${t.date} | ${t.type} | ${t.category} | ${desc} | ${sign}$${money(t.amount)} | ${notes} |`,
      );
    });
  }
  lines.push('');
  lines.push('---');
  lines.push('Please respond in markdown.');
  return lines.join('\n');
};

export const buildCsv = (transactions: Transaction[], monthKey: MonthKey): string => {
  const rows = filterByMonth(transactions, monthKey)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  const escape = (val: string | number) => {
    const s = String(val);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Notes'];
  const lines = [header.join(',')];
  rows.forEach((t) => {
    lines.push(
      [
        t.date,
        t.type,
        t.category,
        t.description,
        t.amount.toFixed(2),
        t.notes || '',
      ]
        .map(escape)
        .join(','),
    );
  });
  return lines.join('\n');
};

export const buildJson = (transactions: Transaction[], monthKey: MonthKey): string => {
  const rows = filterByMonth(transactions, monthKey);
  const stats = buildStats(rows);
  const payload = {
    period: periodLabel(monthKey),
    monthKey,
    generatedAt: new Date().toISOString(),
    summary: {
      income: Number(stats.income.toFixed(2)),
      expense: Number(stats.expense.toFixed(2)),
      net: Number(stats.net.toFixed(2)),
      savingsRate: Number(stats.savingsRate.toFixed(2)),
      transactionCount: stats.txCount,
    },
    categoryBreakdown: stats.byCategory.map((c) => ({
      category: c.name,
      total: Number(c.total.toFixed(2)),
      count: c.count,
      percent: Number(c.pct.toFixed(2)),
    })),
    transactions: rows.map((t) => ({
      date: t.date,
      type: t.type,
      category: t.category,
      description: t.description,
      amount: t.amount,
      notes: t.notes || '',
    })),
  };
  return JSON.stringify(payload, null, 2);
};

export const buildExport = (
  transactions: Transaction[],
  monthKey: MonthKey,
  format: ExportFormat,
): { content: string; filename: string; mime: string } => {
  const slug = monthKey === 'all' ? 'all-time' : monthKey;
  switch (format) {
    case 'ai':
      return {
        content: buildAiReviewMarkdown(transactions, monthKey),
        filename: `transactions-${slug}-ai-review.md`,
        mime: 'text/markdown;charset=utf-8',
      };
    case 'csv':
      return {
        content: buildCsv(transactions, monthKey),
        filename: `transactions-${slug}.csv`,
        mime: 'text/csv;charset=utf-8',
      };
    case 'json':
      return {
        content: buildJson(transactions, monthKey),
        filename: `transactions-${slug}.json`,
        mime: 'application/json;charset=utf-8',
      };
  }
};

export const downloadExport = (
  transactions: Transaction[],
  monthKey: MonthKey,
  format: ExportFormat,
): void => {
  const { content, filename, mime } = buildExport(transactions, monthKey, format);
  const blob = new Blob([content], { type: mime });
  saveAs(blob, filename);
};

export const copyExport = async (
  transactions: Transaction[],
  monthKey: MonthKey,
  format: ExportFormat,
): Promise<boolean> => {
  const { content } = buildExport(transactions, monthKey, format);
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch {
    return false;
  }
};

export type TrackerType = 'crypto' | 'nepal';

export interface PortfolioRow {
  id: string;
  asset: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
  coingeckoId?: string;
}

export type PortfolioState = Record<TrackerType, PortfolioRow[]>;

export interface RowMetrics {
  invested: number;
  totalValue: number;
  pnl: number;
  pnlPercent: number;
}

export interface PortfolioTotals {
  invested: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  positions: number;
}

export type Theme = 'light' | 'dark';

export type Page = 'home' | 'portfolio' | 'gold' | 'expense' | 'analytics';

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
}
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export type CandleInterval = '15m' | '1h' | '4h' | '1d' | '1w';

export interface SpotPrice {
  price: number;
  updatedAt: number;
}

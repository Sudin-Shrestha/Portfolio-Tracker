import { useCallback, useState } from 'react';
import { PortfolioRow } from '../types';
import { fetchNepseSnapshot } from '../utils/nepse';

export interface NepseRefreshResult {
  matched: number;
  missing: string[];
  asOf: string | null;
}

interface State {
  loading: boolean;
  lastUpdated: number | null;
  error: string | null;
}

export const useNepsePrices = (
  nepalRows: PortfolioRow[],
  applyPrices: (priceById: Record<string, number>) => void,
) => {
  const [meta, setMeta] = useState<State>({ loading: false, lastUpdated: null, error: null });

  const refresh = useCallback(async (): Promise<NepseRefreshResult> => {
    setMeta((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const snapshot = await fetchNepseSnapshot();
      const updates: Record<string, number> = {};
      const missing: string[] = [];

      for (const row of nepalRows) {
        const key = row.asset.trim().toUpperCase();
        const quote = key ? snapshot.quotes.get(key) : undefined;
        if (quote && Number.isFinite(quote.lastPrice) && quote.lastPrice > 0) {
          updates[row.id] = quote.lastPrice;
        } else if (key) {
          missing.push(row.asset.trim());
        }
      }

      applyPrices(updates);
      setMeta({ loading: false, lastUpdated: Date.now(), error: null });
      return {
        matched: Object.keys(updates).length,
        missing,
        asOf: snapshot.date,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch NEPSE prices';
      setMeta({ loading: false, lastUpdated: null, error: message });
      return { matched: 0, missing: [], asOf: null };
    }
  }, [nepalRows, applyPrices]);

  return { ...meta, refresh };
};

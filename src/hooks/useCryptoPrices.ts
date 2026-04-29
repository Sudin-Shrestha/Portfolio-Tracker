import { useCallback, useState } from 'react';
import { PortfolioRow } from '../types';
import { fetchPrices, resolveCoinId } from '../utils/coingecko';

interface RefreshResult {
  updated: number;
  skipped: number;
}

interface RefreshState {
  loading: boolean;
  lastUpdated: number | null;
  error: string | null;
}

export const useCryptoPrices = (
  cryptoRows: PortfolioRow[],
  applyPrices: (priceById: Record<string, number>) => void,
) => {
  const [meta, setMeta] = useState<RefreshState>({
    loading: false,
    lastUpdated: null,
    error: null,
  });

  const refresh = useCallback(async (): Promise<RefreshResult> => {
    setMeta((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const idMap = new Map<string, string>();
      for (const row of cryptoRows) {
        const id = resolveCoinId(row.asset, row.coingeckoId);
        if (id) idMap.set(row.id, id);
      }

      if (idMap.size === 0) {
        setMeta({ loading: false, lastUpdated: Date.now(), error: null });
        return { updated: 0, skipped: cryptoRows.length };
      }

      const prices = await fetchPrices(Array.from(new Set(idMap.values())));
      const next: Record<string, number> = {};
      let updated = 0;
      idMap.forEach((coinId, rowId) => {
        const price = prices[coinId];
        if (typeof price === 'number') {
          next[rowId] = price;
          updated += 1;
        }
      });

      applyPrices(next);
      setMeta({ loading: false, lastUpdated: Date.now(), error: null });
      return { updated, skipped: cryptoRows.length - updated };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch prices';
      setMeta({ loading: false, lastUpdated: null, error: message });
      return { updated: 0, skipped: cryptoRows.length };
    }
  }, [cryptoRows, applyPrices]);

  return { ...meta, refresh };
};

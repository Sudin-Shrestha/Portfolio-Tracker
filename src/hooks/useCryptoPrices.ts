import { useCallback, useState } from 'react';
import { PortfolioRow } from '../types';
import { fetchCoinSpotPrices, resolveSymbol } from '../utils/coinspot';

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
      const symbolMap = new Map<string, string>();
      for (const row of cryptoRows) {
        // CoinSpot keys on the ticker (BTC, ETH, ...), which is the asset name.
        const symbol = resolveSymbol(row.asset);
        if (symbol) symbolMap.set(row.id, symbol);
      }

      if (symbolMap.size === 0) {
        setMeta({ loading: false, lastUpdated: Date.now(), error: null });
        return { updated: 0, skipped: cryptoRows.length };
      }

      const prices = await fetchCoinSpotPrices(Array.from(new Set(symbolMap.values())));
      const next: Record<string, number> = {};
      let updated = 0;
      symbolMap.forEach((symbol, rowId) => {
        const price = prices[symbol];
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

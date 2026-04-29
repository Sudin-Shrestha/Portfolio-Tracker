import { useCallback, useEffect, useState } from 'react';
import { Candle, CandleInterval } from '../types';
import { fetchGoldCandles } from '../utils/marketData';

interface CandlesState {
  candles: Candle[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

export const useCandles = (interval: CandleInterval, limit = 120, refreshMs = 0) => {
  const [state, setState] = useState<CandlesState>({
    candles: [],
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const candles = await fetchGoldCandles(interval, limit);
      setState({ candles, loading: false, error: null, lastUpdated: Date.now() });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch candles',
      }));
    }
  }, [interval, limit]);

  useEffect(() => {
    load();
    if (refreshMs <= 0) return;
    const id = window.setInterval(load, refreshMs);
    return () => window.clearInterval(id);
  }, [load, refreshMs]);

  return { ...state, refresh: load };
};

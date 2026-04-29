import { useCallback, useEffect, useState } from 'react';
import { SpotPrice } from '../types';
import { fetchSpotGold } from '../utils/marketData';

interface SpotState {
  spot: SpotPrice | null;
  loading: boolean;
  error: string | null;
}

export const useSpotGold = (refreshMs = 60_000) => {
  const [state, setState] = useState<SpotState>({ spot: null, loading: true, error: null });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const spot = await fetchSpotGold();
      setState({ spot, loading: false, error: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch spot gold',
      }));
    }
  }, []);

  useEffect(() => {
    load();
    if (refreshMs <= 0) return;
    const id = window.setInterval(load, refreshMs);
    return () => window.clearInterval(id);
  }, [load, refreshMs]);

  return { ...state, refresh: load };
};

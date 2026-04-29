import { useCallback, useEffect, useRef, useState } from 'react';
import { PortfolioRow, PortfolioState, TrackerType } from '../types';
import { downloadWorkbook, sampleState } from '../utils/excel';

const STORAGE_KEY = 'portfolio-tracker:state-v1';

const loadInitialState = (): PortfolioState => {
  if (typeof window === 'undefined') return sampleState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return sampleState;
    const parsed = JSON.parse(raw) as PortfolioState;
    if (!parsed.crypto || !parsed.nepal) return sampleState;
    return parsed;
  } catch {
    return sampleState;
  }
};

const newRow = (tracker: TrackerType): PortfolioRow => ({
  id: `${tracker}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  asset: '',
  quantity: 0,
  buyPrice: 0,
  currentPrice: 0,
});

export const usePortfolio = () => {
  const [state, setState] = useState<PortfolioState>(loadInitialState);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }, [state]);

  const addRow = useCallback((tracker: TrackerType) => {
    setState((prev) => ({ ...prev, [tracker]: [...prev[tracker], newRow(tracker)] }));
  }, []);

  const updateRow = useCallback(
    (tracker: TrackerType, id: string, patch: Partial<Omit<PortfolioRow, 'id'>>) => {
      setState((prev) => ({
        ...prev,
        [tracker]: prev[tracker].map((row) => (row.id === id ? { ...row, ...patch } : row)),
      }));
    },
    [],
  );

  const deleteRow = useCallback((tracker: TrackerType, id: string) => {
    setState((prev) => ({
      ...prev,
      [tracker]: prev[tracker].filter((row) => row.id !== id),
    }));
  }, []);

  const replaceTracker = useCallback((tracker: TrackerType, rows: PortfolioRow[]) => {
    setState((prev) => ({ ...prev, [tracker]: rows }));
  }, []);

  const mergeImported = useCallback((imported: Partial<PortfolioState>) => {
    setState((prev) => ({
      crypto: imported.crypto ?? prev.crypto,
      nepal: imported.nepal ?? prev.nepal,
    }));
  }, []);

  const resetSample = useCallback(() => setState(sampleState), []);

  const exportToExcel = useCallback(
    (filename = 'portfolio.xlsx') => downloadWorkbook(state, filename),
    [state],
  );

  return {
    state,
    addRow,
    updateRow,
    deleteRow,
    replaceTracker,
    mergeImported,
    resetSample,
    exportToExcel,
  };
};

import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { PortfolioRow, PortfolioState, TrackerType } from '../types';
import { downloadWorkbook, sampleState } from '../utils/excel';
import { db } from '../firebase';
import { useAuth } from './useAuth';

const emptyState: PortfolioState = { crypto: [], nepal: [] };

const newRow = (tracker: TrackerType): PortfolioRow => ({
  id: `${tracker}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  asset: '',
  quantity: 0,
  buyPrice: 0,
  currentPrice: 0,
});

export const usePortfolio = () => {
  const { user } = useAuth();
  const [state, setState] = useState<PortfolioState>(emptyState);
  const [isLoaded, setIsLoaded] = useState(false);
  const isFirstRender = useRef(true);

  // Load from Firebase on mount or user change
  useEffect(() => {
    if (!user) return;
    
    let isMounted = true;
    getDoc(doc(db, 'portfolios', user.uid)).then((docSnap) => {
      if (!isMounted) return;
      if (docSnap.exists()) {
        const data = docSnap.data() as PortfolioState;
        if (data.crypto && data.nepal) {
           setState(data);
        } else {
           setState(emptyState);
        }
      } else {
        setState(emptyState);
      }
      setIsLoaded(true);
    }).catch((err) => {
       console.error("Failed to load portfolio", err);
       setIsLoaded(true); // fall back to empty state
    });

    return () => { isMounted = false; };
  }, [user]);

  // Sync to Firebase on local state changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Only attempt to save if we've successfully loaded the remote state first
    if (!isLoaded || !user) return;

    // Firestore crashes if an object contains 'undefined'. 
    // JSON.stringify drops 'undefined' keys automatically, matching localStorage behavior.
    const cleanState = JSON.parse(JSON.stringify(state));

    setDoc(doc(db, 'portfolios', user.uid), cleanState).catch((err) => {
      console.error(err);
      alert("Firebase Error (Portfolios): " + err.message);
    });
  }, [state, isLoaded, user]);

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

  // For testing, users can press "reset sample" to populate Firebase with dummy data instantly
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

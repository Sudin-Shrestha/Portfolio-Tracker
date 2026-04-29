import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Candle } from '../types';

const STREAK_THRESHOLD = 3;

const getInitialPermission = (): NotificationPermission => {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return Notification.permission;
};

export const useGreenCandleAlert = (
  candles: Candle[],
  enabled: boolean,
  intervalMs: number,
) => {
  const [permission, setPermission] = useState<NotificationPermission>(getInitialPermission);
  const baselineRef = useRef<number | null>(null);
  const lastNotifiedRef = useRef<number | null>(null);

  const supported = typeof window !== 'undefined' && 'Notification' in window;

  const lastClosed = useMemo(() => {
    const now = Date.now();
    for (let i = candles.length - 1; i >= 0; i -= 1) {
      if (candles[i].time + intervalMs <= now) return { candle: candles[i], index: i };
    }
    return null;
  }, [candles, intervalMs]);

  const streak = useMemo(() => {
    if (!lastClosed) return 0;
    let count = 0;
    for (let i = lastClosed.index; i >= 0; i -= 1) {
      if (candles[i].close > candles[i].open) count += 1;
      else break;
    }
    return count;
  }, [candles, lastClosed]);

  useEffect(() => {
    if (!enabled) {
      baselineRef.current = null;
      lastNotifiedRef.current = null;
      return;
    }
    if (lastClosed && baselineRef.current === null) {
      baselineRef.current = lastClosed.candle.time;
    }
  }, [enabled, lastClosed]);

  useEffect(() => {
    if (!enabled || permission !== 'granted' || !lastClosed) return;
    if (streak < STREAK_THRESHOLD) return;
    if (baselineRef.current !== null && lastClosed.candle.time <= baselineRef.current) return;
    if (lastNotifiedRef.current === lastClosed.candle.time) return;

    lastNotifiedRef.current = lastClosed.candle.time;
    try {
      new Notification('Gold 15M — 3 green candles in a row', {
        body: `${streak} consecutive green candles. Last close: USD ${lastClosed.candle.close.toFixed(2)}`,
        tag: 'gold-green-streak',
      });
    } catch {
      // ignore notification errors
    }
  }, [enabled, permission, streak, lastClosed]);

  const requestPermission = useCallback(async () => {
    if (!supported) return 'denied' as NotificationPermission;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, [supported]);

  const sendTestNotification = useCallback(() => {
    if (permission !== 'granted') return;
    try {
      new Notification('Gold alerts enabled', {
        body: `You'll be pinged when 3 green 15M candles close in a row. Current streak: ${streak}.`,
        tag: 'gold-test',
      });
    } catch {
      // ignore
    }
  }, [permission, streak]);

  return {
    supported,
    permission,
    streak,
    requestPermission,
    sendTestNotification,
  };
};

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Candle } from '../types';

const STREAK_THRESHOLD = 3;

type AlertDelivery = 'sent' | 'failed';

interface AlertEvent {
  candleTime?: number;
  close?: number;
  streak?: number;
  delivery: AlertDelivery;
  message: string;
}

interface AlertState {
  lastAlert: AlertEvent | null;
  lastTest: AlertEvent | null;
}

type DesktopNotificationOptions = NotificationOptions & {
  requireInteraction?: boolean;
  timestamp?: number;
};

const getErrorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : 'Unknown notification error';

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
  const [alertState, setAlertState] = useState<AlertState>({
    lastAlert: null,
    lastTest: null,
  });
  const lastNotifiedRef = useRef<number | null>(null);

  const hasNotificationApi = typeof window !== 'undefined' && 'Notification' in window;
  const isSecureContext = typeof window !== 'undefined' && window.isSecureContext;
  const supported = hasNotificationApi && isSecureContext;
  const unsupportedReason = !hasNotificationApi
    ? 'Browser notifications are not supported here.'
    : !isSecureContext
    ? 'Browser notifications require HTTPS or localhost.'
    : null;

  const showDesktopNotification = useCallback(
    async (title: string, options: DesktopNotificationOptions): Promise<AlertEvent> => {
      if (!supported) {
        return {
          delivery: 'failed',
          message: unsupportedReason ?? 'Browser notifications are not available here.',
        };
      }
      const currentPermission = hasNotificationApi ? Notification.permission : permission;
      if (currentPermission !== 'granted') {
        return {
          delivery: 'failed',
          message: `Notification permission is ${currentPermission}.`,
        };
      }

      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/notification-sw.js');
          await navigator.serviceWorker.ready;
          await registration.showNotification(title, options);
          return {
            delivery: 'sent',
            message: 'Desktop notification sent through the service worker.',
          };
        } catch (err) {
          console.warn('[gold-alert] Service worker notification failed:', err);
        }
      }

      try {
        const notification = new Notification(title, options);
        notification.onerror = (event) =>
          console.warn('[gold-alert] Notification error event:', event);
        notification.onshow = () => console.info('[gold-alert] Notification shown.');
        return {
          delivery: 'sent',
          message: 'Desktop notification requested through the browser.',
        };
      } catch (err) {
        console.warn('[gold-alert] Notification constructor failed:', err);
        return {
          delivery: 'failed',
          message: `Browser blocked the desktop notification: ${getErrorMessage(err)}`,
        };
      }
    },
    [hasNotificationApi, permission, supported, unsupportedReason],
  );

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
      lastNotifiedRef.current = null;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || permission !== 'granted' || !lastClosed) return;
    if (streak < STREAK_THRESHOLD) return;
    if (lastNotifiedRef.current === lastClosed.candle.time) return;

    lastNotifiedRef.current = lastClosed.candle.time;

    let cancelled = false;
    void showDesktopNotification('Gold 15M - 3 green candles in a row', {
      body: `${streak} consecutive green candles. Last close: USD ${lastClosed.candle.close.toFixed(2)}`,
      tag: 'gold-green-streak',
      requireInteraction: true,
      timestamp: Date.now(),
    }).then((result) => {
      if (cancelled) return;
      setAlertState((prev) => ({
        ...prev,
        lastAlert: {
          candleTime: lastClosed.candle.time,
          close: lastClosed.candle.close,
          streak,
          ...result,
        },
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, permission, streak, lastClosed, showDesktopNotification]);

  const requestPermission = useCallback(async () => {
    if (!supported) return 'denied' as NotificationPermission;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, [supported]);

  const sendTestNotification = useCallback(async () => {
    const result = await showDesktopNotification('Gold alerts enabled', {
      body: `You'll be pinged when 3 green 15M candles close in a row. Current streak: ${streak}.`,
      tag: 'gold-test',
      requireInteraction: true,
      timestamp: Date.now(),
    });
    setAlertState((prev) => ({
      ...prev,
      lastTest: {
        streak,
        ...result,
      },
    }));
  }, [showDesktopNotification, streak]);

  useEffect(() => {
    const refreshPermission = () => {
      if (hasNotificationApi) setPermission(Notification.permission);
    };
    window.addEventListener('focus', refreshPermission);
    document.addEventListener('visibilitychange', refreshPermission);
    return () => {
      window.removeEventListener('focus', refreshPermission);
      document.removeEventListener('visibilitychange', refreshPermission);
    };
  }, [hasNotificationApi]);

  return {
    supported,
    permission,
    streak,
    lastAlert: alertState.lastAlert,
    lastTest: alertState.lastTest,
    unsupportedReason,
    requestPermission,
    sendTestNotification,
  };
};

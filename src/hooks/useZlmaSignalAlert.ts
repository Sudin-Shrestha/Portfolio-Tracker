import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ZlmaSignal } from '../utils/zlmaTrend';

type AlertDelivery = 'sent' | 'failed';

interface SignalAlertEvent {
  signalTime?: number;
  type?: 'up' | 'dn';
  close?: number;
  delivery: AlertDelivery;
  message: string;
}

interface AlertState {
  lastAlert: SignalAlertEvent | null;
  lastTest: SignalAlertEvent | null;
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

// Fires a desktop notification the moment a ZLMA/EMA crossover (up = BUY) or
// crossunder (dn = SELL) appears — the Pine signalUp/signalDn events, live.
export const useZlmaSignalAlert = (signals: ZlmaSignal[], enabled: boolean) => {
  const [permission, setPermission] = useState<NotificationPermission>(getInitialPermission);
  const [alertState, setAlertState] = useState<AlertState>({ lastAlert: null, lastTest: null });
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
    async (title: string, options: DesktopNotificationOptions): Promise<SignalAlertEvent> => {
      if (!supported) {
        return {
          delivery: 'failed',
          message: unsupportedReason ?? 'Browser notifications are not available here.',
        };
      }
      const currentPermission = hasNotificationApi ? Notification.permission : permission;
      if (currentPermission !== 'granted') {
        return { delivery: 'failed', message: `Notification permission is ${currentPermission}.` };
      }

      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/notification-sw.js');
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(title, options);
          return { delivery: 'sent', message: 'Desktop notification sent through the service worker.' };
        } catch (err) {
          console.warn('[zlma-alert] Service worker notification failed:', err);
        }
      }

      try {
        const notification = new Notification(title, options);
        notification.onerror = (event) =>
          console.warn('[zlma-alert] Notification error event:', event);
        return { delivery: 'sent', message: 'Desktop notification requested through the browser.' };
      } catch (err) {
        console.warn('[zlma-alert] Notification constructor failed:', err);
        return {
          delivery: 'failed',
          message: `Browser blocked the desktop notification: ${getErrorMessage(err)}`,
        };
      }
    },
    [hasNotificationApi, permission, supported, unsupportedReason],
  );

  // The most recent signal — including one forming on the live (not-yet-closed)
  // candle, so the alert fires the moment a crossover is seen.
  const latestSignal = useMemo(
    () => (signals.length > 0 ? signals[signals.length - 1] : null),
    [signals],
  );

  useEffect(() => {
    if (!enabled) lastNotifiedRef.current = null;
  }, [enabled]);

  useEffect(() => {
    if (!enabled || permission !== 'granted' || !latestSignal) return;
    if (lastNotifiedRef.current === latestSignal.time) return;

    lastNotifiedRef.current = latestSignal.time;
    const isUp = latestSignal.type === 'up';

    let cancelled = false;
    void showDesktopNotification(
      isUp ? 'Gold 5M — BUY signal ▲' : 'Gold 5M — SELL signal ▼',
      {
        body: `${isUp ? 'ZLMA crossed above EMA (buy)' : 'ZLMA crossed below EMA (sell)'}. Price: USD ${latestSignal.close.toFixed(2)}`,
        tag: 'gold-zlma-signal',
        requireInteraction: true,
        timestamp: Date.now(),
      },
    ).then((result) => {
      if (cancelled) return;
      setAlertState((prev) => ({
        ...prev,
        lastAlert: {
          signalTime: latestSignal.time,
          type: latestSignal.type,
          close: latestSignal.close,
          ...result,
        },
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, permission, latestSignal, showDesktopNotification]);

  const requestPermission = useCallback(async () => {
    if (!supported) return 'denied' as NotificationPermission;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, [supported]);

  const sendTestNotification = useCallback(async () => {
    const result = await showDesktopNotification('Gold trend-signal alerts enabled', {
      body: "You'll be pinged when ZLMA crosses EMA (up/down) on a closed 5M candle.",
      tag: 'gold-zlma-test',
      requireInteraction: true,
      timestamp: Date.now(),
    });
    setAlertState((prev) => ({ ...prev, lastTest: result }));
  }, [showDesktopNotification]);

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
    lastSignal: latestSignal,
    lastAlert: alertState.lastAlert,
    lastTest: alertState.lastTest,
    unsupportedReason,
    requestPermission,
    sendTestNotification,
  };
};

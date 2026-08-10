import { useSyncExternalStore } from 'react';

const subscribe = (onChange: () => void): (() => void) => {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
};

const getSnapshot = (): boolean => navigator.onLine !== false;

/**
 * Tracks browser connectivity. `navigator.onLine` only reports whether a
 * network interface is up, so it can be optimistic — the sync layer still
 * treats a failed request as its own signal. It is reliable in the other
 * direction (offline really means offline), which is what we need to stop
 * queuing doomed requests and to flush pending ones on reconnect.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}

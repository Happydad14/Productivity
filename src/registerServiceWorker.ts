/**
 * Registers the offline service worker (production builds only — in dev the
 * Vite server owns module serving and a cache in front of it only causes
 * stale-bundle confusion).
 *
 * The worker calls skipWaiting/clients.claim, so a new deploy takes over as
 * soon as it installs. When that happens on an already-open tab we reload
 * once, otherwise the page would keep running the previous bundle while the
 * cache serves the new one.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  // Captured before registering: on a first-ever install there is no
  // controller, and that takeover must not trigger a reload.
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {
        // Pick up new deploys when the user comes back to the tab.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') registration.update().catch(() => {});
        });
      })
      .catch(() => {
        // Unsupported browser, private mode, or an insecure origin — the app
        // still works, just without offline caching.
      });
  });
}

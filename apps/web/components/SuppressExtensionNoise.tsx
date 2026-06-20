'use client';

import { useEffect } from 'react';

/**
 * Specter uses NO web3 / wallet code. But browser wallet extensions (MetaMask,
 * Phantom, …) inject a script into every page and emit unhandled rejections like
 * "Failed to connect to MetaMask". Next.js's dev error overlay then catches that
 * and shows it as if it were an app error.
 *
 * This guard swallows ONLY errors that originate from a browser extension
 * (chrome-extension:// / moz-extension://). Real app errors never match, so
 * nothing of ours is hidden. Registered in the capture phase so it runs before
 * the dev overlay's own listener.
 */
export function SuppressExtensionNoise() {
  useEffect(() => {
    const isExtensionNoise = (value: unknown): boolean => {
      const err = value as { stack?: string; message?: string } | string | undefined;
      const text = typeof err === 'string' ? err : `${err?.stack ?? ''} ${err?.message ?? ''}`;
      return /chrome-extension:\/\/|moz-extension:\/\/|Failed to connect to MetaMask/i.test(text);
    };

    const onRejection = (e: PromiseRejectionEvent) => {
      if (isExtensionNoise(e.reason)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    const onError = (e: ErrorEvent) => {
      if (isExtensionNoise(e.error ?? e.message) || /extension:\/\//i.test(e.filename ?? '')) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };

    window.addEventListener('unhandledrejection', onRejection, true);
    window.addEventListener('error', onError, true);
    return () => {
      window.removeEventListener('unhandledrejection', onRejection, true);
      window.removeEventListener('error', onError, true);
    };
  }, []);

  return null;
}

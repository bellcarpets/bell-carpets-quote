/**
 * usePwaForceUpdate
 *
 * Version-check force-update strategy:
 * On app focus / visibility change, fetch /api/trpc/version.get and compare
 * to the hash loaded at startup. If different → hard reload to pick up new assets.
 *
 * Note: service worker registration has been intentionally removed. This is a
 * live-data quote system where offline caching is not needed. A broken service
 * worker was intercepting all requests and causing white screen on preview pages.
 * The /sw.js route on the server now returns a self-unregistering cleanup script
 * so any previously cached service workers are removed on the next visit.
 */
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

// The hash loaded when this module was first evaluated (i.e., when the page loaded).
let LOADED_HASH: string | null = null;

export function usePwaForceUpdate() {
  // Version check on focus / visibility change
  const versionQuery = trpc.version.get.useQuery(undefined, {
    // Don't run on mount — only run when we manually trigger via refetch
    enabled: false,
    staleTime: 0,
  });

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const result = await versionQuery.refetch();
        const serverHash = result.data?.hash;
        if (!serverHash) return;

        if (LOADED_HASH === null) {
          // First check — store the hash as the baseline
          LOADED_HASH = serverHash;
          return;
        }

        if (LOADED_HASH !== serverHash) {
          // New deployment detected — hard reload to pick up new assets
          console.log("[PWA] New version detected, reloading...");
          window.location.reload();
        }
      } catch {
        // Network error — ignore, will retry on next focus
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkVersion();
      }
    };

    const handleFocus = () => {
      checkVersion();
    };

    // Run immediately on mount to capture the baseline hash
    checkVersion();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

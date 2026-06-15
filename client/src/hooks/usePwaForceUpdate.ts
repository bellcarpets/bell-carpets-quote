/**
 * usePwaForceUpdate
 *
 * Registers the service worker and implements a two-layer force-update strategy:
 * 1. Service worker: on every SW update, immediately skip waiting → all clients reload.
 * 2. Version check: on app focus / visibility change, fetch /api/trpc/version.get
 *    and compare to the hash loaded at startup. If different → hard reload.
 */
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

// The hash loaded when this module was first evaluated (i.e., when the page loaded).
let LOADED_HASH: string | null = null;

export function usePwaForceUpdate() {
  // 1. Register service worker
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => {
        // Check for updates immediately on every page load
        registration.update();

        // When a new SW is waiting, tell it to skip waiting immediately
        const activateWaiting = (sw: ServiceWorker) => {
          sw.postMessage("SKIP_WAITING");
        };

        if (registration.waiting) {
          activateWaiting(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          const newSw = registration.installing;
          if (!newSw) return;
          newSw.addEventListener("statechange", () => {
            if (newSw.state === "installed" && registration.waiting) {
              activateWaiting(registration.waiting);
            }
          });
        });
      })
      .catch((err) => {
        console.warn("[SW] Registration failed:", err);
      });

    // When the SW controller changes (new SW took over), reload the page
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  }, []);

  // 2. Version check on focus / visibility change
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

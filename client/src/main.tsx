import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

/**
 * Recover from stale-asset failures. When a browser holds an old index.html that
 * references asset filenames from a previous build, those requests now 404 (the
 * server no longer serves HTML for missing assets). A failed module/chunk load
 * would otherwise leave a blank screen. Here we detect that specific failure and
 * do a single guarded reload to fetch the current index.html + matching assets.
 */
function recoverFromStaleAssetError() {
  const KEY = "stale_asset_reload_ts";
  try {
    const last = Number(sessionStorage.getItem(KEY) || "0");
    if (Date.now() - last < 60_000) return; // already tried recently — don't loop
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable; still attempt one reload
  }
  window.location.reload();
}

window.addEventListener("error", (event) => {
  const msg = String(event?.message || "");
  // "Unexpected token '<'" = HTML served where JS expected (stale asset request).
  if (msg.includes("Unexpected token '<'") || msg.includes("Failed to fetch dynamically imported module")) {
    recoverFromStaleAssetError();
  }
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = String(event?.reason?.message || event?.reason || "");
  if (reason.includes("Failed to fetch dynamically imported module") || reason.includes("error loading dynamically imported module")) {
    recoverFromStaleAssetError();
  }
});

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);

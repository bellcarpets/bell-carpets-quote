/**
 * Version endpoint — returns the current server build hash.
 * The client polls this on focus/visibility change and force-reloads if the hash differs.
 *
 * The hash MUST be stable for the lifetime of a given build and only change when
 * a new build is deployed. Previously it fell back to `dev-${Date.now()}`, which
 * produced a NEW value on every server boot/spin-up (common on Render). That made
 * the client force-reload on every tab focus, and combined with a stale cached
 * shell it caused persistent white screens.
 *
 * We now derive the hash from the built client asset filenames (content-hashed by
 * Vite). This is deterministic per build and changes only when the client code
 * actually changes. An explicit BUILD_HASH env var, if set, always wins.
 */
import fs from "fs";
import path from "path";
import { publicProcedure, router } from "./_core/trpc";

function computeBuildHash(): string {
  // Explicit override always wins.
  if (process.env.BUILD_HASH) return process.env.BUILD_HASH;

  try {
    // In production the server bundle lives in dist/ and static assets in dist/public.
    // In development the built client (if present) lives in dist/public.
    const candidates = [
      path.resolve(import.meta.dirname, "public", "assets"),
      path.resolve(import.meta.dirname, "..", "..", "dist", "public", "assets"),
    ];
    for (const dir of candidates) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir).sort().join("|");
        if (files) {
          // Stable, short, changes only when asset filenames (i.e. content) change.
          let h = 0;
          for (let i = 0; i < files.length; i++) {
            h = (h * 31 + files.charCodeAt(i)) | 0;
          }
          return `build-${(h >>> 0).toString(36)}`;
        }
      }
    }
  } catch {
    // fall through
  }

  // Dev fallback: stable for the life of this process only.
  return `dev-${process.pid}`;
}

const BUILD_HASH = computeBuildHash();

export const versionRouter = router({
  get: publicProcedure.query(() => {
    return { hash: BUILD_HASH };
  }),
});

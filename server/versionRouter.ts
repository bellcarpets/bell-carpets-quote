/**
 * Version endpoint — returns the current server build hash.
 * The client polls this on focus/visibility change and force-reloads if the hash differs.
 */
import { publicProcedure, router } from "./_core/trpc";

// BUILD_HASH is set via environment variable at deploy time.
// Falls back to process startup time so dev always gets a unique value.
const BUILD_HASH = process.env.BUILD_HASH ?? `dev-${Date.now()}`;

export const versionRouter = router({
  get: publicProcedure.query(() => {
    return { hash: BUILD_HASH };
  }),
});

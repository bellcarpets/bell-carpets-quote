export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
//
// On this deployment (Render) the Manus OAuth portal env vars
// (VITE_OAUTH_PORTAL_URL / VITE_APP_ID) are not set, so this previously produced
// a garbage URL like "undefined/app-auth?appId=undefined". Guard against that:
// if the OAuth config is missing, return null so callers fall back to the
// on-page password login instead of redirecting somewhere broken.
export const getLoginUrl = (): string | null => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // No OAuth configured for this host — use password login, no redirect.
  if (!oauthPortalUrl || !appId) {
    return null;
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};

/**
 * Xero OAuth2 callback route — handles the redirect from Xero after authorization.
 * Registered as GET /api/xero/callback
 */
import type { Express } from "express";
import {
  exchangeCodeForTokens,
  getXeroTenants,
  saveXeroTokens,
} from "./xeroHelper";

export function registerXeroOAuthRoutes(app: Express) {
  app.get("/api/xero/callback", async (req, res) => {
    try {
      const code = req.query.code as string | undefined;
      const error = req.query.error as string | undefined;

      if (error) {
        console.error("[Xero OAuth] Authorization denied:", error);
        return res.redirect("/admin?xero=error&reason=" + encodeURIComponent(error));
      }

      if (!code) {
        console.error("[Xero OAuth] No authorization code received");
        return res.redirect("/admin?xero=error&reason=no_code");
      }

      // Exchange code for tokens
      const tokens = await exchangeCodeForTokens(code);

      // Get connected tenants
      const tenants = await getXeroTenants(tokens.accessToken);
      if (tenants.length === 0) {
        console.error("[Xero OAuth] No tenants found");
        return res.redirect("/admin?xero=error&reason=no_tenants");
      }

      // Use the first tenant (most orgs only have one)
      const tenant = tenants[0];

      // Save tokens to DB
      await saveXeroTokens({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
        connectionId: tenant.id,
      });

      console.log(`[Xero OAuth] Connected to ${tenant.tenantName} (${tenant.tenantId})`);
      return res.redirect("/admin?xero=connected&org=" + encodeURIComponent(tenant.tenantName));
    } catch (e: any) {
      console.error("[Xero OAuth] Callback error:", e.message);
      return res.redirect("/admin?xero=error&reason=" + encodeURIComponent(e.message));
    }
  });
}

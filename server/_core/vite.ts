import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function registerPdfRoute(app: Express) {
  // GET /api/quote/:slug/pdf — streams the quote PDF with correct Content-Type
  // so Safari opens it natively in its PDF viewer without any blob URL workaround.
  app.get("/api/quote/:slug/pdf", async (req, res) => {
    try {
      const { generateQuotePdfBuffer } = await import("../quotePdf.js");
      const { pdfBuffer, quoteNumber } = await generateQuotePdfBuffer(req.params.slug);
      const filename = `${quoteNumber}-Quote.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.setHeader("Cache-Control", "no-store");
      res.end(pdfBuffer);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("not found")) {
        res.status(404).type("text/plain").send("Quote not found");
      } else {
        console.error("[PDF route]", err);
        res.status(500).type("text/plain").send("PDF generation failed");
      }
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // Return a self-unregistering service worker script for /sw.js.
  // Without this, the catch-all below serves index.html for /sw.js, causing
  // the browser to register a broken service worker that intercepts all requests
  // and produces a white screen on quote preview pages.
  app.get("/sw.js", (_req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "no-store");
    res.send(
      "self.addEventListener('install', () => self.skipWaiting());\n" +
      "self.addEventListener('activate', (event) => {\n" +
      "  event.waitUntil(\n" +
      "    self.registration.unregister()\n" +
      "      .then(() => self.clients.matchAll())\n" +
      "      .then((clients) => clients.forEach((c) => c.navigate(c.url)))\n" +
      "  );\n" +
      "});\n"
    );
  });

  // Any request that looks like a static asset (has a file extension) but
  // wasn't served by express.static above means the file does not exist.
  // Return a real 404 instead of falling through to index.html. Without this,
  // a stale browser requesting an old hashed asset (e.g. /assets/index-OLD.js)
  // receives index.html (text/html) with a 200, the browser then tries to run
  // HTML as JavaScript, throws "Unexpected token '<'", and the app white-screens
  // before React can mount (so the ErrorBoundary never catches it).
  const STATIC_FILE_RE = /\.[a-z0-9]+$/i;
  app.use((req, res, next) => {
    if (STATIC_FILE_RE.test(req.path)) {
      res.status(404).type("text/plain").send("Not found");
      return;
    }
    next();
  });

  // SPA client-side routing: serve index.html for all non-asset routes.
  // no-store so browsers never hold a stale shell that points at old asset hashes.
  app.use("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

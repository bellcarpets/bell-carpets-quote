import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Explicitly handle /sw.js — return a self-unregistering service worker script.
  // This ensures any existing cached service workers are cleaned up on the next
  // visit. Without this, the SPA catch-all below serves index.html for /sw.js,
  // causing the browser to register a broken service worker that intercepts all
  // requests and produces a white screen on quote preview pages.
  app.get("/sw.js", (_req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "no-store");
    res.send(
      "// Service worker unregister script\n" +
      "// Cleans up any previously registered service workers.\n" +
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

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);

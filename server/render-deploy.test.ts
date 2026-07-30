import { describe, it, expect } from "vitest";

describe("Render API credentials", () => {
  it("should have RENDER_API_KEY set", () => {
    expect(process.env.RENDER_API_KEY).toBeDefined();
    expect(process.env.RENDER_API_KEY!.startsWith("rnd_")).toBe(true);
  });

  it("should have RENDER_SERVICE_ID set", () => {
    expect(process.env.RENDER_SERVICE_ID).toBeDefined();
    expect(process.env.RENDER_SERVICE_ID!.startsWith("srv-")).toBe(true);
  });

  it("should be able to list services via Render API", async () => {
    const res = await fetch("https://api.render.com/v1/services?limit=1", {
      headers: { Authorization: `Bearer ${process.env.RENDER_API_KEY}` },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});

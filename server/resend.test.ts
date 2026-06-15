import { describe, it, expect } from "vitest";

describe("Resend API key validation", () => {
  it("should have RESEND_API_KEY set", () => {
    expect(process.env.RESEND_API_KEY).toBeDefined();
    expect(process.env.RESEND_API_KEY).toMatch(/^re_/);
  });

  it("should be able to reach Resend API with the key", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY not set");

    // Hit the Resend domains endpoint — lightweight, no side effects
    const response = await fetch("https://api.resend.com/domains", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    // 200 = valid key, 401 = invalid key
    expect(response.status).toBe(200);
  }, 15000);
});

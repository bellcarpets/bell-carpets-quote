import { describe, it, expect } from "vitest";

describe("Twilio credentials validation", () => {
  it("should have all Twilio env vars set", () => {
    expect(process.env.TWILIO_ACCOUNT_SID).toBeDefined();
    expect(process.env.TWILIO_ACCOUNT_SID).toMatch(/^AC/);
    expect(process.env.TWILIO_AUTH_TOKEN).toBeDefined();
    expect(process.env.TWILIO_FROM_NUMBER).toBeDefined();
    expect(process.env.TWILIO_FROM_NUMBER).toMatch(/^\+/);
  });

  it("should authenticate successfully with Twilio API", async () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID!;
    const authToken = process.env.TWILIO_AUTH_TOKEN!;

    // Hit the account endpoint — lightweight, no side effects
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        },
      }
    );

    // 200 = valid credentials
    expect(response.status).toBe(200);
    const data = await response.json() as { sid: string; status: string };
    expect(data.sid).toBe(accountSid);
    expect(data.status).toBe("active");
  }, 15000);
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { readSession, signSession, signInConfigured } from "@/lib/session";

/**
 * The cookie is the only place a sign-in exists, so what it refuses is the whole
 * of its security (ITD 22).
 */

const SECRET = "a-secret-long-enough-to-sign-with";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("a signed-in cookie", () => {
  it("comes back with the account it was signed for", () => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    const cookie = signSession({ payerId: "D5CKAUQ8V7ADL", email: "buyer@example.com" });

    expect(cookie).not.toBeNull();
    expect(readSession(cookie)).toMatchObject({
      payerId: "D5CKAUQ8V7ADL",
      email: "buyer@example.com",
    });
  });

  it("refuses a payer id that was edited into it", () => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    const cookie = signSession({ payerId: "D5CKAUQ8V7ADL", email: "buyer@example.com" })!;
    const [payload, signature] = cookie.split(".");

    // The attack this signature exists to stop: swap in someone else's account
    // and keep the signature that was made for the original.
    const forged = Buffer.from(
      JSON.stringify({ payerId: "SOMEONE-ELSE", email: "else@example.com", exp: 99_999_999_999 }),
    ).toString("base64url");

    expect(readSession(`${forged}.${signature}`)).toBeNull();
    expect(readSession(`${payload}.${signature}x`)).toBeNull();
    expect(readSession(`${payload}.`)).toBeNull();
    expect(readSession("nonsense")).toBeNull();
  });

  it("stops working when it expires", () => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-11T10:00:00Z"));

    const cookie = signSession({ payerId: "D5CKAUQ8V7ADL", email: "" })!;
    expect(readSession(cookie)).not.toBeNull();

    // Two hours and a second: the same bytes, no longer a session.
    vi.setSystemTime(new Date("2026-11-11T12:00:01Z"));
    expect(readSession(cookie)).toBeNull();
  });

  it("is unavailable rather than unsigned when there is no secret", () => {
    vi.stubEnv("SESSION_SECRET", "");
    expect(signInConfigured()).toBe(false);
    expect(signSession({ payerId: "D5CKAUQ8V7ADL", email: "" })).toBeNull();
    // A cookie from a deployment that had a secret is not trusted by one that does not.
    expect(readSession("anything.anything")).toBeNull();
  });

  it("treats a secret too short to be one as absent", () => {
    vi.stubEnv("SESSION_SECRET", "short");
    expect(signInConfigured()).toBe(false);
    expect(signSession({ payerId: "D5CKAUQ8V7ADL", email: "" })).toBeNull();
  });

  it("does not accept a cookie signed with a different secret", () => {
    vi.stubEnv("SESSION_SECRET", SECRET);
    const cookie = signSession({ payerId: "D5CKAUQ8V7ADL", email: "" })!;

    vi.stubEnv("SESSION_SECRET", "a-completely-different-secret");
    expect(readSession(cookie)).toBeNull();
  });
});

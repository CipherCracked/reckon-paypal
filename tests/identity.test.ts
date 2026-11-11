import { afterEach, describe, expect, it, vi } from "vitest";
import { callbackUri, readProfile } from "@/lib/paypal/identity";
import { publicOrigin, signInHop, signInOrigin } from "@/lib/origin";

/**
 * Two addresses and one id decide whether a sign-in is real: the browser's own
 * origin (a cookie is bound to it) and the payer id (records are filed under it).
 * Both were wrong in a live run before these tests existed.
 */

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function request(url: string, headers: Record<string, string> = {}) {
  return new Request(url, { headers });
}

describe("the address the browser is on", () => {
  it("keeps 127.0.0.1 rather than the localhost Next rewrites it to", () => {
    // Next parses this as http://localhost:3001; the Host header is the truth.
    // They are different cookie domains, so redirecting across them loses the
    // session that was just set.
    expect(publicOrigin(request("http://localhost:3001/account", { host: "127.0.0.1:3001" }))).toBe(
      "http://127.0.0.1:3001",
    );
  });

  it("lets a configured origin win, for a host that is rewritten in front of us", () => {
    vi.stubEnv("APP_ORIGIN", "https://companion.example/");
    expect(publicOrigin(request("http://localhost:3001/account", { host: "127.0.0.1:3001" }))).toBe(
      "https://companion.example",
    );
  });

  it("uses the same origin for the address PayPal returns to", () => {
    expect(callbackUri(request("http://localhost:3001/auth/paypal/start", { host: "127.0.0.1:3001" }))).toBe(
      "http://127.0.0.1:3001/auth/paypal/callback",
    );
  });
});

describe("the address PayPal will accept", () => {
  it("hands PayPal the registered spelling of this machine", () => {
    // A browser opened on localhost asks for a redirect_uri of localhost, and
    // PayPal answers that with "invalid client_id or redirect_uri" on its own
    // site — observed 2026-11-11, with the dashboard having refused localhost
    // and taken 127.0.0.1.
    expect(signInOrigin(request("http://localhost:3001/account", { host: "localhost:3001" }))).toBe(
      "http://127.0.0.1:3001",
    );
  });

  it("leaves a real deployment's origin alone", () => {
    expect(signInOrigin(request("https://companion.example/account", { host: "companion.example" }))).toBe(
      "https://companion.example",
    );
  });

  it("lets PAYPAL_RETURN_ORIGIN name the registered origin", () => {
    vi.stubEnv("PAYPAL_RETURN_ORIGIN", "https://pay.example/");
    expect(signInOrigin(request("https://companion.example/account", { host: "companion.example" }))).toBe(
      "https://pay.example",
    );
  });

  it("moves a localhost browser to the spelling PayPal knows", () => {
    expect(signInHop(request("http://localhost:3001/account", { host: "localhost:3001" }))).toBe(
      "http://127.0.0.1:3001/auth/paypal/start",
    );
  });

  it("does not move anyone who is already in the right place", () => {
    expect(signInHop(request("http://127.0.0.1:3001/account", { host: "127.0.0.1:3001" }))).toBeNull();
    expect(signInHop(request("https://companion.example/account", { host: "companion.example" }))).toBeNull();
  });

  it("never bounces across ports, which would be a redirect that cannot end", () => {
    // A configured origin on another port is a misconfiguration; following it
    // would arrive, be told to hop, and arrive again.
    vi.stubEnv("PAYPAL_RETURN_ORIGIN", "http://127.0.0.1:4000");
    expect(signInHop(request("http://localhost:3001/account", { host: "localhost:3001" }))).toBeNull();
  });
});

describe("who PayPal says this is", () => {
  function userinfo(body: unknown) {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })));
    return readProfile("token");
  }

  it("takes the payer id the attributes scope returns", async () => {
    await expect(userinfo({ payer_id: "D5CKAUQ8V7ADL", email: "buyer@example.com" })).resolves.toEqual({
      payerId: "D5CKAUQ8V7ADL",
      email: "buyer@example.com",
    });
  });

  it("still takes an account whose older userinfo spells the payer id as user_id", async () => {
    await expect(userinfo({ user_id: "D5CKAUQ8V7ADL" })).resolves.toMatchObject({
      payerId: "D5CKAUQ8V7ADL",
    });
  });

  it("refuses an opaque subject, which is a name for a person and not a payer id", async () => {
    // What a sandbox app with only `openid` granted actually returns. Reading it
    // as an id signs the person in and then claims the store holds nothing for
    // them, which is false.
    const subject = "https://www.paypal.com/webapps/auth/identity/user/M3Pa4nVD8D4mxG5wrn0JpT4YWllgWCxE";
    await expect(userinfo({ user_id: subject, sub: subject })).resolves.toBeNull();
  });

  it("refuses an answer with no identity in it at all", async () => {
    await expect(userinfo({})).resolves.toBeNull();
  });
});

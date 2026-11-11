/**
 * The address the browser actually used to reach us.
 *
 * `new URL(request.url).origin` is not it: Next.js normalises a development
 * request to `localhost`, so a person who opened `127.0.0.1` is redirected to
 * `localhost` and arrives with none of their cookies — a cookie is bound to a
 * host, and those are two hosts. A sign-in that worked would land signed out.
 *
 * The Host header is the address the browser typed, so it decides. `APP_ORIGIN`
 * overrides it for a deployment behind something that rewrites Host.
 */
export function publicOrigin(request: Request): string {
  const configured = process.env.APP_ORIGIN?.trim().replace(/\/+$/, "");
  if (configured) return configured;

  const url = new URL(request.url);
  const host = request.headers.get("host")?.trim();
  return host ? `${url.protocol}//${host}` : url.origin;
}

/**
 * The address a sign-in must start and finish on.
 *
 * It is not `publicOrigin`, because PayPal holds one registered return URL and
 * answers anything else with *"Looks like this action is not supported … (invalid
 * client_id or redirect_uri)"* — a dead end on PayPal's own site, where the person
 * cannot be told anything. Measured on this app: the dashboard refused
 * `localhost` and took `127.0.0.1`, so a browser that typed `localhost` cannot
 * sign in until it is moved to the spelling PayPal knows. Same machine, same port,
 * different string.
 *
 * `PAYPAL_RETURN_ORIGIN` (then `APP_ORIGIN`) names the registered origin where a
 * deployment's is not the one the browser used.
 */
export function signInOrigin(request: Request): string {
  const configured = (process.env.PAYPAL_RETURN_ORIGIN ?? process.env.APP_ORIGIN)
    ?.trim()
    .replace(/\/+$/, "");
  if (configured) return configured;

  const url = new URL(publicOrigin(request));
  if (url.hostname === "localhost" || url.hostname === "[::1]") url.hostname = "127.0.0.1";
  return url.origin;
}

/**
 * The hop off a loopback spelling PayPal will not accept, or `null`.
 *
 * Only the two spellings of this machine are ever moved, and only when the port
 * matches, so a misconfigured `PAYPAL_RETURN_ORIGIN` cannot bounce a visitor
 * between two hosts forever.
 */
export function signInHop(request: Request): string | null {
  const here = new URL(publicOrigin(request));
  if (here.hostname !== "localhost" && here.hostname !== "[::1]") return null;

  const there = new URL(signInOrigin(request));
  if (there.hostname !== "127.0.0.1" || there.port !== here.port) return null;
  return `${there.origin}/auth/paypal/start`;
}

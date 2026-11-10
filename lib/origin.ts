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

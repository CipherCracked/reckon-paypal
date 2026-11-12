/**
 * The shop's address.
 *
 * Every choice the shop offers is a link (IPD 34), so the URL is the page's
 * whole state and it is built in one place: the shelf, the price row and the
 * next-page link all pass what they mean through here. A parameter that is
 * absent is left out rather than sent empty, because `?price=` on a link a
 * person copies should not appear to mean something.
 */
export type ShopParams = {
  q?: string | null;
  category?: string | null;
  price?: string | null;
  after?: string | null;
};

export function shopHref({ q, category, price, after }: ShopParams = {}): string {
  const params = new URLSearchParams();

  const words = q?.trim();
  if (words) params.set("q", words);
  if (category) params.set("category", category);
  // "Any price" is the absence of a narrowing, not a value.
  if (price && price !== "any") params.set("price", price);
  if (after) params.set("after", after);

  const query = params.toString();
  return query ? `/shop?${query}` : "/shop";
}

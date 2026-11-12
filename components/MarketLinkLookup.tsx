/**
 * A product URL someone sent you (IPD 36).
 *
 * The shop's second input, deliberately smaller than the search: a person who
 * holds a link already knows what they want and needs one field, not a mode.
 * The sentence above it says what it is for, so the label can stay short.
 *
 * A failed address stays in the field, so correcting it does not mean typing it
 * again — and the failure itself is rendered by the page above this form, once,
 * in the same voice as every other sentence on the shop.
 */
export function MarketLinkLookup({ value }: { value?: string }) {
  return (
    <form className="market-link" action="/shop" method="get">
      <label htmlFor="market-link">Sent a link? Paste the product page&apos;s address.</label>
      <div className="market-link-row">
        <input
          id="market-link"
          name="link"
          type="url"
          inputMode="url"
          defaultValue={value}
          maxLength={2048}
          placeholder="https://"
        />
        <button type="submit" className="button-secondary">
          Open it
        </button>
      </div>
    </form>
  );
}

import Link from "next/link";

const SUGGESTIONS = ["headphones", "subscription box", "coffee maker", "running shoes", "desk lamp"];

/**
 * The way into the catalogue, wherever it is offered (IPD 28).
 *
 * It appears twice — on the entry, where checking something new is one of the
 * two things a person came to do, and on the shop, where it is the page's whole
 * job — so the field, the label and the suggestions are written once. The shop
 * is a GET form so a search is a URL a person can keep, and that stays true
 * wherever the form is rendered.
 */
export function MarketSearch({
  query,
  inputId = "market-q",
}: {
  /** Pre-filled value — the shop passes the current search. */
  query?: string;
  inputId?: string;
}) {
  return (
    <form className="market-search" action="/shop" method="get" role="search">
      <label htmlFor={inputId}>What are you looking for?</label>
      <div className="market-search-row">
        <input
          id={inputId}
          name="q"
          type="search"
          defaultValue={query}
          maxLength={120}
          aria-describedby={`${inputId}-hint`}
        />
        <button type="submit" className="button-primary">
          Search
        </button>
      </div>
      <p id={`${inputId}-hint`} className="field-hint">
        Searching:{" "}
        {SUGGESTIONS.map((suggestion, index) => (
          <span key={suggestion}>
            {index > 0 ? " · " : ""}
            <Link href={`/shop?q=${encodeURIComponent(suggestion)}`}>{suggestion}</Link>
          </span>
        ))}
      </p>
    </form>
  );
}

/**
 * The way into the catalogue, wherever it is offered (IPD 28).
 *
 * It appears twice — on the entry, where checking something new is one of the
 * two things a person came to do, and on the shop, where it is the page's whole
 * job — so the field and the label are written once. The shop is a GET form so
 * a search is a URL a person can keep, and that stays true wherever the form is
 * rendered.
 *
 * The five suggestion links that used to sit under the field are gone (IPD 33):
 * they were a shelf we wrote, and the shop now has a shelf the catalogue wrote.
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
        />
        <button type="submit" className="button-primary">
          Search
        </button>
      </div>
    </form>
  );
}

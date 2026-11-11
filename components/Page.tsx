import { BackLink } from "@/components/BackLink";

/**
 * The frame inside the frame (ITD 25).
 *
 * Every screen had its own copy of this: a `.page` wrapper, an optional back
 * link, an eyebrow, an `h1` and a lede. The copies drifted — the same back link
 * was called "Back to the ways in" on four screens, "Back to the search" on
 * five, and "Back to this product" on one — because each route decided its own
 * header rhythm in its own file. The rhythm is not a per-screen decision.
 *
 * A screen reached by drilling into something passes `back`; a screen that is a
 * destination does not, because the frame's navigation is the way out (IPD 28).
 * The label names the parent in the product's own words rather than in a
 * metaphor, and it is the page's job to name it correctly — this component can
 * only guarantee that a way back exists and says where it goes.
 */
export function Page({
  title,
  eyebrow,
  lede,
  back,
  headerExtra,
  wide = false,
  children,
}: {
  title?: React.ReactNode;
  eyebrow?: React.ReactNode;
  lede?: React.ReactNode;
  back?: { href: string; label: string };
  /**
   * A front door, not a reading column (IPD 30).
   *
   * A receipt or a bill is a document and 46rem is the right measure for it. A
   * page whose job is to make an impression was also 46rem inside a 64rem bar,
   * so its left edge started 144px in from the frame's own and the page read as
   * a sheet pinned to a wall. The front door takes the frame's width; everything
   * that is read rather than looked at keeps the narrow one.
   */
  wide?: boolean;
  /** Rendered inside the header, under the title — the account bar, for one. */
  headerExtra?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className={wide ? "page page-wide" : "page"}>
      {back ? <BackLink href={back.href}>{back.label}</BackLink> : null}

      {title ? (
        <header className="page-header">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
          {lede ? <p className="lede">{lede}</p> : null}
          {headerExtra}
        </header>
      ) : null}

      {children}

      {/* The one qualification on every screen, in the one place a caveat
          belongs (IPD 29). It used to be written out on each screen that needed
          it, in a different sentence each time, until a page about three figures
          was mostly a page about what the page was not. */}
      <p className="footnote">
        Sandbox store: no real money moves and nothing you do is stored.
      </p>
    </div>
  );
}

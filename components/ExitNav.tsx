import Link from "next/link";

/**
 * The end of a route, and never a dead end (IPD 28).
 *
 * A receipt and a pasted document both used to finish with a pair of links
 * chosen per screen: the record's were `/read` and `/shop`, and the document
 * reader's was a button back to the reader itself. Neither ever mentioned the
 * home screen or the person's own record, so the two screens a person is most
 * likely to leave from were the two that could not send them anywhere useful.
 */
export function ExitNav({ links }: { links: Array<{ href: string; label: string }> }) {
  return (
    <nav className="record-exits" aria-label="Where to go next">
      {links.map((link) => (
        <Link key={link.href} className="button-secondary" href={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

/** The ways on from a record, in one place so every error branch offers the same ones. */
export const RECORD_EXITS = [
  { href: "/", label: "Back to the start" },
  { href: "/account", label: "See everything this store holds for you" },
  { href: "/read", label: "Read a document" },
];

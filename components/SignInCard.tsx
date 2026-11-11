/**
 * The sign-in, stated once (IPD 27, IPD 28).
 *
 * It is on the entry — where a person decides whether they trust the site — and
 * on the account screen, which exists for the frames where the entry has already
 * been answered. Two places, one wording: a promise about what is read and what
 * is kept must not be paraphrased per screen, because the paraphrase is where a
 * stronger claim than the product can support gets made.
 *
 * The button leaves for PayPal. It sits *under* the sentence rather than beside
 * the header's control, so nothing here asks for a PayPal account before the
 * page has said what it will do with it.
 */
export function SignInCard({
  heading = "See what you have already agreed to",
  id = "signin-what",
}: {
  heading?: string;
  id?: string;
}) {
  return (
    <section className="signin-card" aria-labelledby={id}>
      <h2 id={id}>{heading}</h2>
      <p>
        Sign in with the PayPal account you paid with. We show the subscriptions this store holds
        under it — what each adds up to, and what leaving costs — read from PayPal when you ask.
      </p>
      <a className="button-primary" href="/auth/paypal/start">
        Sign in with PayPal
      </a>
    </section>
  );
}

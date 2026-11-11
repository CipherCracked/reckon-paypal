import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Page } from "@/components/Page";
import { SignInCard } from "@/components/SignInCard";
import { identityConfigured } from "@/lib/paypal/identity";
import { SESSION_COOKIE, readSession, signInConfigured } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * The sign-in screen (IPD 25, IPD 28).
 *
 * It used to be the record as well, which made one page answer two questions and
 * gave the product two front doors. Now the record is the home screen, and this
 * page has one job: say what signing in reads and what it keeps, and offer the
 * button.
 *
 * Someone already signed in is sent to the home screen rather than shown a sign-
 * in for an account they are holding. A bookmark to this address therefore costs
 * one redirect, which is cheaper than a page that has to admit it has nothing to
 * say to them.
 *
 * The four reasons PayPal's return can carry still land here, because this is
 * where the attempt started and where the person is looking.
 */

const SIGN_IN_REASONS: Record<string, string> = {
  denied: "That sign-in was not completed. Nothing was read.",
  failed: "PayPal did not complete the sign-in. Nothing was read.",
  unreadable:
    "PayPal signed you in but did not share the PayPal account id this store looks subscriptions up by, so nothing was read. That id has to be ticked in the app's Log in with PayPal settings.",
  unavailable: "Signing in is not switched on for this deployment.",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ signin?: string }>;
}) {
  const { signin } = await searchParams;
  const person = readSession((await cookies()).get(SESSION_COOKIE)?.value);

  if (person) redirect("/");

  // Nothing to sign in with — the one case where the page says the feature is
  // off rather than offering a button that cannot work.
  if (!identityConfigured() || !signInConfigured()) {
    return (
      <Page
        title="Signing in is not available here"
        lede="This deployment has no PayPal sign-in configured, so there is nothing to sign in to. Every other part of the product works without it."
      >
        <p className="notice">
          Signing in with PayPal is not switched on for this deployment, so nothing was read.
        </p>
      </Page>
    );
  }

  return (
    <Page
      title="See what this store holds for you"
      lede="The record is the home screen once you are signed in. Signing in changes nothing about this site except that it can find what you already agreed to."
    >
      {signin && SIGN_IN_REASONS[signin] ? (
        <p className="notice" role="status">
          {SIGN_IN_REASONS[signin]}
        </p>
      ) : null}

      <SignInCard />
    </Page>
  );
}

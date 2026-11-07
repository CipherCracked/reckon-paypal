import Link from "next/link";
import { CommitmentRecord } from "@/components/CommitmentRecord";
import { findProduct } from "@/lib/catalog/products";
import { computeCommitment } from "@/lib/commitment/compute";
import { paypalBaseUrl } from "@/lib/paypal/client";
import { isSettled, retrieveOrder, retrieveSubscription } from "@/lib/paypal/retrieve";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ slug?: string }>;
};

function manageUrl(): string {
  const sandbox = paypalBaseUrl().includes("sandbox");
  return `https://www.${sandbox ? "sandbox." : ""}paypal.com/myaccount/autopay/`;
}

/**
 * The end of the journey (IPD 15). A payment that PayPal has not confirmed has
 * no record to show, and a confirmed one is the last screen rather than a stop:
 * it offers the two ways on, and no way back into the payment.
 */
export default async function ReceiptPage({ params, searchParams }: PageProps) {
  const { orderId } = await params;
  const { slug } = await searchParams;
  const product = slug ? findProduct(slug) : undefined;

  if (!product) {
    return (
      <div className="page">
        <p className="notice">This record is for a purchase this store does not recognise.</p>
        <RecordExits />
      </div>
    );
  }

  const recurring = product.terms.shape === "recurring";

  let status: string;
  let nextBillingTime: string | null = null;

  try {
    if (recurring) {
      const subscription = await retrieveSubscription(orderId);
      status = subscription.status;
      nextBillingTime = subscription.nextBillingTime;
    } else {
      status = (await retrieveOrder(orderId)).status;
    }
  } catch {
    return (
      <div className="page">
        <p className="notice">
          We cannot confirm this payment with PayPal right now, so there is no record to show.
          Nothing has been charged twice — check PayPal directly if you are unsure.
        </p>
        <RecordExits />
      </div>
    );
  }

  if (!isSettled(status)) {
    return (
      <div className="page">
        <p className="notice">
          PayPal has not confirmed this payment, so there is nothing to record yet. Nothing has
          been taken.
        </p>
        <RecordExits />
      </div>
    );
  }

  const translation = computeCommitment(product.terms);
  const nextDate = nextBillingTime ? new Date(nextBillingTime) : null;

  return (
    <div className="page">
      <CommitmentRecord
        productName={product.name}
        reference={orderId}
        paidToday={translation.today}
        acrossTerm={translation.acrossTerm}
        exit={translation.exit}
        nextCharge={
          recurring ? { date: nextDate, amount: translation.today } : null
        }
        manageUrl={manageUrl()}
        calendarHref={
          recurring
            ? `/api/receipt/${encodeURIComponent(orderId)}/calendar?slug=${encodeURIComponent(product.slug)}`
            : null
        }
      />

      <RecordExits />
    </div>
  );
}

/** Two ways on, and never a third one back into a payment (IPD 15). */
function RecordExits() {
  return (
    <nav className="record-exits" aria-label="Where to go next">
      <Link className="button-secondary" href="/read">
        Read another document
      </Link>
      <Link className="button-secondary" href="/shop">
        Browse the shop
      </Link>
    </nav>
  );
}

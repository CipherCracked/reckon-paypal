"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BillDoorProps = {
  slug: string;
  name: string;
  biller: string;
  amount: string;
};

/**
 * A bill only exists once the biller has issued it, so this door asks PayPal
 * for one and takes the shopper to the screen it produces (IPD 12). Nothing is
 * kept here; the bill page re-reads it from PayPal.
 *
 * It reads as a link rather than a button because it is a way in, not an action
 * on this page (IPD 14).
 */
export function BillDoor({ slug, name, biller, amount }: BillDoorProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "working" | "failed">("idle");
  const [message, setMessage] = useState("");

  async function open() {
    setStatus("working");
    setMessage("");

    try {
      const response = await fetch("/api/paypal/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const body = (await response.json()) as { invoiceId?: string; error?: string };

      if (!response.ok || !body.invoiceId) {
        setStatus("failed");
        setMessage(body.error ?? "PayPal could not create this bill.");
        return;
      }

      router.push(`/bill/${encodeURIComponent(body.invoiceId)}?slug=${encodeURIComponent(slug)}`);
    } catch {
      setStatus("failed");
      setMessage("PayPal could not be reached. The other ways in still work.");
    }
  }

  return (
    <div className="inline-action" data-door="bill">
      <button
        type="button"
        className="link-button"
        onClick={open}
        disabled={status === "working"}
      >
        {status === "working"
          ? "Asking PayPal for the bill…"
          : `${name} from ${biller} — ${amount}`}
      </button>
      {status === "failed" ? (
        <p className="notice notice-error" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}

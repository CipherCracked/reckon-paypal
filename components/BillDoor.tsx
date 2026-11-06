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
    <li className="product-card" data-door="bill">
      <p className="door-label">A bill</p>
      <h2>{name}</h2>
      <p>
        From {biller}. Owed by a date, not bought today — {amount}.
      </p>
      <button type="button" className="button-secondary" onClick={open} disabled={status === "working"}>
        {status === "working" ? "Asking PayPal for the bill…" : "Open this bill"}
      </button>
      {status === "failed" ? (
        <p className="notice" role="alert">
          {message}
        </p>
      ) : null}
    </li>
  );
}

"use client";

import {
  INSTANCE_LOADING_STATE,
  PayPalOneTimePaymentButton,
  PayPalProvider,
  PayPalSubscriptionButton,
  usePayPal,
  type Components,
} from "@paypal/react-paypal-js/sdk-v6";
import { useEffect, useRef } from "react";
import type { CommitmentShape } from "@/lib/commitment/types";

export type PayPalButtonProps = {
  /** The shape the figures were for. Repeating and financed are both subscriptions. */
  shape: CommitmentShape;
  clientId: string;
  environment: "sandbox" | "production";
  /** True while the screen is already asking PayPal for something. */
  disabled?: boolean;
  /** Creates the order at our own route; the amount agreement stays there. */
  createOrder: () => Promise<{ orderId: string }>;
  /** Creates the subscription at our own route, and hands PayPal its id. */
  createSubscription: () => Promise<{ subscriptionId: string }>;
  onApproved: (id: string) => void;
  onCancelled: () => void;
  onFailed: () => void;
  onUnavailable: () => void;
};

/**
 * PayPal's own button, and nothing else.
 *
 * The SDK loads a browser script and mounts a control into a container it owns,
 * so everything here is the untestable surface the suite stubs as one module
 * (ITD 40). Every decision — which route, which sentence, where the shopper
 * lands — is made by the screen and passed in; this component only reports what
 * PayPal's script did.
 */
export default function PayPalButton(props: PayPalButtonProps) {
  // The subscription button needs its own component script; the one-time
  // button does not, and loading it would be a request for nothing.
  const components: Components[] =
    props.shape === "one_time" ? ["paypal-payments"] : ["paypal-subscriptions"];

  return (
    <PayPalProvider
      clientId={props.clientId}
      environment={props.environment}
      components={components}
      pageType="checkout"
    >
      <Control {...props} />
    </PayPalProvider>
  );
}

function Control(props: PayPalButtonProps) {
  const { loadingStatus } = usePayPal();
  // A failed script is reported once. Without the guard, every render after the
  // failure would ask the screen for the fallback again.
  const reported = useRef(false);
  const { onUnavailable } = props;

  useEffect(() => {
    if (loadingStatus === INSTANCE_LOADING_STATE.REJECTED && !reported.current) {
      reported.current = true;
      onUnavailable();
    }
  }, [loadingStatus, onUnavailable]);

  if (loadingStatus === INSTANCE_LOADING_STATE.REJECTED) {
    // The screen has the fallback in hand and says so in its own words; a
    // second sentence here would be two explanations for one failure.
    return null;
  }

  if (loadingStatus !== INSTANCE_LOADING_STATE.RESOLVED) {
    // A state, not a spinner: nothing on this screen has ever animated, and a
    // wait on this product is said in words (IPD 50).
    return (
      <p className="commitment-hint" role="status">
        Preparing PayPal&rsquo;s button
      </p>
    );
  }

  if (props.shape !== "one_time") {
    return (
      <PayPalSubscriptionButton
        type="subscribe"
        disabled={props.disabled}
        createSubscription={props.createSubscription}
        onApprove={async ({ subscriptionId }) => props.onApproved(subscriptionId)}
        onCancel={() => props.onCancelled()}
        onError={() => props.onFailed()}
      />
    );
  }

  return (
    <PayPalOneTimePaymentButton
      type="pay"
      disabled={props.disabled}
      createOrder={props.createOrder}
      onApprove={async ({ orderId }) => props.onApproved(orderId)}
      onCancel={() => props.onCancelled()}
      onError={() => props.onFailed()}
    />
  );
}

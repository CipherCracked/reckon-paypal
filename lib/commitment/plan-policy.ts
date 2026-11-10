/**
 * What this product configures a PayPal plan to do when a payment fails.
 *
 * It lives on its own because two places need the same number and only one of
 * them is the plan: `lib/paypal/subscriptions.ts` sends it to PayPal as
 * `payment_preferences.payment_failure_threshold`, and the catalogue states it
 * on the terms so the schedule can tell the shopper before they agree. A screen
 * that promised something different from the plan it creates would not be
 * noticed until a payment failed.
 */
export const SUSPEND_AFTER_FAILED_PAYMENTS = 1;

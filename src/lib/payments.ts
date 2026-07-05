/**
 * Payment gateway integration seam.
 *
 * The app currently supports two CV generation plans:
 *  - "free": the PDF is generated with a centered watermark.
 *  - "paid": the PDF is generated clean (no watermark).
 *
 * No payment gateway is wired up yet — selecting "paid" does NOT charge the
 * user today. This module exists so that hooking up real billing later only
 * requires changing this file, not every call site that renders a CV.
 */

export type CvPlan = "free" | "paid";

export interface PaymentCheckResult {
  allowed: boolean;
  reason: string;
}

/**
 * Decide whether the current request may receive a "paid" (watermark-free)
 * render right now.
 *
 * TODO(payments): once a payment gateway is integrated (Stripe, or the
 * existing `src/app/api/webhooks/whop` provider), this should check the
 * user's subscription/credit balance and return `allowed: false` with a
 * reason when payment is required but missing. Until then every "paid"
 * request is allowed for free so the plan UI/UX can ship ahead of billing.
 */
export function checkPaidGenerationAllowed(): PaymentCheckResult {
  return { allowed: true, reason: "payments_not_yet_integrated" };
}

/**
 * TODO(payments): implement once a provider is chosen, e.g.
 *   export async function createCheckoutSession(userId: string, cvId: string): Promise<{ url: string }>
 * and call it from a new `/api/billing/checkout` route, redirecting the user
 * to the provider's hosted checkout page before flipping their plan to "paid".
 */

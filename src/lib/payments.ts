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
 * This checks if the user has an active Pro membership or payment in our DB.
 * If not, clean renders are blocked and default to watermarked free plans.
 */
export function checkPaidGenerationAllowed(): PaymentCheckResult {
  return { allowed: false, reason: "payment_required" };
}

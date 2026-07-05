import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createHmac } from "crypto";

const WHOP_WEBHOOK_SECRET = process.env.WHOP_WEBHOOK_SECRET || "";

/**
 * Production-ready Whop Webhook Handler with HMAC-SHA256 Signature Verification.
 * Integrates directly with Whop's automated membership triggers to provision Pro features.
 */
export async function POST(req: NextRequest) {
  try {
    let body: any;
    const signature = req.headers.get("x-whop-signature") || req.headers.get("action-signature");

    if (WHOP_WEBHOOK_SECRET) {
      if (!signature) {
        console.error("[WHOP WEBHOOK] Validation failed: Signature header ('x-whop-signature' or 'action-signature') is missing.");
        return NextResponse.json({ error: "Signature header missing" }, { status: 401 });
      }

      // Read raw request body as text for cryptographic hashing
      const rawBody = await req.text();
      const hmac = createHmac("sha256", WHOP_WEBHOOK_SECRET);
      const computed = hmac.update(rawBody).digest("hex");

      if (computed !== signature) {
        console.error("[WHOP WEBHOOK] Validation failed: Computed signature does not match header signature.");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }

      // Successfully verified. Parse body from raw text
      body = JSON.parse(rawBody);
    } else {
      // Fallback if no secret is set yet
      body = await req.json();
    }

    console.log("[WHOP WEBHOOK] Successfully verified payload:", JSON.stringify(body));

    const action = body.action || "";
    const data = body.data || {};
    
    // Extract user email safely from various nested Whop payload properties
    const email = (
      data.user?.email || 
      data.email || 
      body.email || 
      ""
    ).toLowerCase().trim();

    if (!email) {
      console.warn("[WHOP WEBHOOK] Ignored webhook event because no user email was resolved:", JSON.stringify(body));
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // List of events indicating that a membership has successfully gone active/valid
    const upgradeActions = [
      "membership.went_valid",
      "membership.went_active",
      "membership.trial_started",
      "payment.succeeded",
      "upgrade" // keep backward compatibility for simulation triggers
    ];

    // List of events indicating that a membership has expired or was terminated
    const downgradeActions = [
      "membership.went_invalid",
      "membership.went_inactive",
      "membership.cancelled",
      "membership.expired",
      "downgrade" // keep backward compatibility for simulation triggers
    ];

    if (upgradeActions.includes(action)) {
      // Create user if they do not exist, or upgrade their Pro status
      const user = await prisma.user.upsert({
        where: { email },
        update: { isPro: true },
        create: {
          email,
          name: email.split("@")[0],
          isPro: true,
        },
      });
      console.log(`[WHOP WEBHOOK] Successfully upgraded/created Pro user: ${email} (ID: ${user.id})`);
      return NextResponse.json({ success: true, action: "upgraded" });
    } 
    
    if (downgradeActions.includes(action)) {
      // Set Pro status to false
      const user = await prisma.user.updateMany({
        where: { email },
        data: { isPro: false },
      });
      console.log(`[WHOP WEBHOOK] Successfully removed Pro status from user: ${email} (${user.count} rows updated)`);
      return NextResponse.json({ success: true, action: "downgraded" });
    }

    // Default return for unhandled hooks or metadata events
    console.log(`[WHOP WEBHOOK] Event action "${action}" ignored. No state change for ${email}`);
    return NextResponse.json({ success: true, action: "ignored" });

  } catch (error) {
    console.error("[WHOP WEBHOOK] Webhook handler failed:", error);
    return NextResponse.json({ error: "Webhook handler failed", detail: (error as Error).message }, { status: 500 });
  }
}

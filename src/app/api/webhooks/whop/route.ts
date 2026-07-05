import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createHmac } from "crypto";
import { renderCvPdf } from "@/lib/pdf";
import { sendEmail } from "@/lib/email";
import { CVContentSchema, JobParsedSchema, type CVContent } from "@/lib/schemas";

const WHOP_WEBHOOK_SECRET = process.env.WHOP_WEBHOOK_SECRET || "";

/**
 * Production-ready Whop Webhook Handler with HMAC-SHA256 Signature Verification.
 * Integrates directly with Whop's automated membership triggers to provision Pro features
 * and automatically emails the user their watermark-free premium CV.
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

      // Automatically find the user's latest CV to render and email it to them!
      try {
        const latestCv = await prisma.cv.findFirst({
          where: { userId: user.id },
          orderBy: { updatedAt: "desc" },
          include: { job: true }
        });

        if (latestCv) {
          let roleTitle: string | null = null;
          if (latestCv.job) {
            try { roleTitle = JobParsedSchema.parse(latestCv.job.parsedJson).jobTitle; } catch { /* ignore */ }
          }

          let content: CVContent;
          try {
            content = CVContentSchema.parse(latestCv.contentJson);
          } catch {
            content = latestCv.contentJson as CVContent;
          }

          if (!roleTitle && content.targetRole) {
            roleTitle = content.targetRole;
          }

          // Render the high-resolution, watermark-free PDF
          const pdfBuffer = await renderCvPdf({
            templateId: latestCv.templateId,
            accentColor: latestCv.accentColor,
            fontId: latestCv.fontId,
            fullName: latestCv.fullName,
            email: latestCv.email,
            phone: latestCv.phone,
            photoBase64: latestCv.photoBase64,
            roleTitle,
            content,
            language: latestCv.language || "en",
            isPro: true, // Unlock watermark
          });

          // Generate a custom receipt / ticket id
          const ticketId = `ABCV-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

          // Log the successful checkout event in our DB
          try {
            await prisma.checkout.create({
              data: {
                email,
                amount: 1.8,
                status: "succeeded",
                ticketId,
              }
            });
            console.log(`[WHOP WEBHOOK] Logged successful checkout for ${email} with ticket: ${ticketId}`);
          } catch (logErr) {
            console.error("[WHOP WEBHOOK] Failed to log checkout row:", logErr);
          }

          // Send the welcome/delivery email
          await sendEmail({
            to: email,
            subject: "Your Premium abCV is Here! 🎉 (No Watermark)",
            html: `
              <div style="font-family: sans-serif; color: #1e293b; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                <div style="text-align: center; margin-bottom: 20px;">
                  <span style="background: linear-gradient(135deg, #7c3aed, #d946ef); color: white; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 14px;">abCV Pro</span>
                </div>
                <h2 style="color: #0f172a; text-align: center; margin-bottom: 5px;">Thank You for Your Purchase!</h2>
                <p style="font-size: 14px; text-align: center; color: #64748b; margin-top: 0;">Ticket / Order ID: <strong>${ticketId}</strong></p>
                <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;">
                <p style="font-size: 14px; line-height: 1.5; color: #334155;">
                  Hi <strong>${latestCv.fullName}</strong>,
                </p>
                <p style="font-size: 14px; line-height: 1.5; color: #334155;">
                  Your payment has been successfully processed! We have automatically unlocked your account and attached your premium, **watermark-free** CV PDF directly to this email.
                </p>
                <div style="background-color: #f8fafc; border-radius: 8px; padding: 12px; margin: 15px 0; border-left: 3px solid #7c3aed;">
                  <span style="font-size: 12px; display: block; color: #64748b;">CV Template:</span>
                  <span style="font-size: 14px; font-weight: bold; color: #0f172a; text-transform: capitalize;">${latestCv.templateId}</span>
                </div>
                <p style="font-size: 14px; line-height: 1.5; color: #334155;">
                  You can also download your CV any time or generate more layouts directly on your dashboard:
                </p>
                <p style="text-align: center; margin: 20px 0;">
                  <a href="https://www.abcv.site/dashboard" style="background-color: #7c3aed; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Open Dashboard</a>
                </p>
                <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;">
                <p style="font-size: 11px; text-align: center; color: #94a3b8; margin: 0;">
                  © 2026 abCV. Built with precision for premium professionals.<br>
                  <a href="https://www.abcv.site" style="color: #7c3aed; text-decoration: none;">www.abcv.site</a>
                </p>
              </div>
            `,
            attachments: [
              {
                filename: `${latestCv.fullName.replace(/\s+/g, "_")}_CV.pdf`,
                content: pdfBuffer.toString("base64"),
                content_type: "application/pdf"
              }
            ]
          });
          console.log(`[WHOP WEBHOOK] Auto-rendered and emailed premium CV to ${email} for CV ID ${latestCv.id}`);
        }
      } catch (cvError) {
        console.error("[WHOP WEBHOOK] Failed to auto-render/email premium CV to paid user:", cvError);
      }

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

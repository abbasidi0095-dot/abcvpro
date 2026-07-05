import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Validates a promo code submitted by any guest or customer user.
 * Return { valid: true } if matching the active promo code.
 */
export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code || !code.trim()) {
      return NextResponse.json({ valid: false, reason: "empty_code" });
    }

    let activePromo = await prisma.promo.findUnique({ where: { id: "active_promo" } });
    if (!activePromo) {
      // Default fallback promo if none exists yet
      activePromo = await prisma.promo.create({
        data: { id: "active_promo", code: "FREEABCV" }
      });
    }

    const inputCode = code.toUpperCase().trim();
    const matches = inputCode === activePromo.code;

    return NextResponse.json({ valid: matches });
  } catch (error) {
    console.error("Failed to validate promo code:", error);
    return NextResponse.json({ error: "Failed to validate code" }, { status: 500 });
  }
}

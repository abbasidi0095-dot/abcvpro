import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return store.get("abcv_admin_session")?.value === "true";
}

/**
 * Admin API to get the current active promo code.
 */
export async function GET() {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let promo = await prisma.promo.findUnique({ where: { id: "active_promo" } });
    if (!promo) {
      promo = await prisma.promo.create({
        data: { id: "active_promo", code: "FREEABCV" }
      });
    }
    return NextResponse.json({ success: true, code: promo.code });
  } catch (error) {
    console.error("Failed to fetch admin promo:", error);
    return NextResponse.json({ error: "Failed to load promo code" }, { status: 500 });
  }
}

/**
 * Admin API to update the active promo code.
 */
export async function PATCH(req: NextRequest) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { code } = await req.json();

    if (!code || !code.trim()) {
      return NextResponse.json({ error: "Promo code cannot be empty" }, { status: 400 });
    }

    const updated = await prisma.promo.upsert({
      where: { id: "active_promo" },
      update: { code: code.toUpperCase().trim() },
      create: { id: "active_promo", code: code.toUpperCase().trim() },
    });

    return NextResponse.json({ success: true, code: updated.code });
  } catch (error) {
    console.error("Failed to update admin promo:", error);
    return NextResponse.json({ error: "Failed to update promo code" }, { status: 500 });
  }
}

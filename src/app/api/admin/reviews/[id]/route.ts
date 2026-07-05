import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return store.get("abcv_admin_session")?.value === "true";
}

/**
 * Handles individual review status changes (approve/disapprove).
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await ctx.params;
    const { approved } = await req.json();

    const review = await prisma.review.update({
      where: { id },
      data: { approved: Boolean(approved) },
    });

    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error("Failed to update review status:", error);
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
  }
}

/**
 * Handles individual review deletion.
 */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await ctx.params;
    await prisma.review.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete review:", error);
    return NextResponse.json({ error: "Failed to delete review" }, { status: 500 });
  }
}

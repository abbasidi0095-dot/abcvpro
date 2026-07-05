import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return store.get("abcv_admin_session")?.value === "true";
}

/**
 * Administrative Dashboard Data Aggregator.
 * Collects users, checkouts, and reviews under secure session validation.
 */
export async function GET() {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch registered users
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });

    // 2. Fetch Whop successful checkouts
    const checkouts = await prisma.checkout.findMany({
      orderBy: { createdAt: "desc" },
    });

    // 3. Fetch all reviews (approved & unapproved)
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Calculate sum statistics
    const totalRevenue = checkouts.reduce((sum, c) => sum + c.amount, 0);

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: users.length,
        proUsers: users.filter((u) => u.isPro).length,
        totalCheckouts: checkouts.length,
        totalRevenue,
      },
      users,
      checkouts,
      reviews,
    });
  } catch (error) {
    console.error("Admin dashboard data fetch failed:", error);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}

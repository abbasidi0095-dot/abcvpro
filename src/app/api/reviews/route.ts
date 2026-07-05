import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const MOCK_REVIEWS = [
  {
    name: "Alex Rivera",
    email: "alex.rivera@tech.io",
    rating: 5,
    text: "Absolutely mind-blowing. I pasted a complex Staff Engineer job link and had a tailored, stunning Bento Grid resume in hand in 20 seconds. Got the interview!",
    approved: true,
  },
  {
    name: "Sarah Jenkins",
    email: "sarah.j@healthlife.org",
    rating: 5,
    text: "Finally, a generator that doesn't just output generic software developer text. As a Nurse Practitioner, the medical terms and clinic experiences generated were incredibly accurate.",
    approved: true,
  },
  {
    name: "David Chen",
    email: "dchen@designagency.co",
    rating: 5,
    text: "The Editorial template is a masterpiece. The typography and asymmetrical columns look like they were custom crafted by an elite branding agency. Well worth the $1.80!",
    approved: true,
  },
  {
    name: "Emma Watson",
    email: "emma.watson@growth.com",
    rating: 5,
    text: "The automated cover letter matches the CV perfectly. Outstanding job with the Whop payment flow as well—immediate PDF download and email receipt.",
    approved: true,
  },
  {
    name: "Michael Kraft",
    email: "m.kraft@operations.de",
    rating: 5,
    text: "Clean, fast, and extremely professional. The ability to customize sections and adjust accent colors live makes this the best builder on the market.",
    approved: true,
  }
];

/**
 * Public Review Fetcher - Returns approved testimonials for the landing page.
 */
export async function GET() {
  try {
    let reviews = await prisma.review.findMany({
      where: { approved: true },
      orderBy: { createdAt: "desc" },
    });

    // Auto-seed mock reviews if the table is currently empty
    if (reviews.length === 0) {
      await prisma.review.createMany({ data: MOCK_REVIEWS });
      reviews = await prisma.review.findMany({
        where: { approved: true },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("Failed to load reviews:", error);
    return NextResponse.json({ error: "Failed to load reviews" }, { status: 500 });
  }
}

/**
 * Public Review Creator - Allows users to submit a review.
 * Held as unapproved (approved: false) until verified in the Admin Dashboard.
 */
export async function POST(req: NextRequest) {
  try {
    const { name, email, rating, text } = await req.json();

    if (!name || !email || !text) {
      return NextResponse.json({ error: "Name, email, and review text are required" }, { status: 400 });
    }

    const stars = Math.min(5, Math.max(1, parseInt(rating, 10) || 5));

    const review = await prisma.review.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        rating: stars,
        text,
        approved: false, // Moderated default
      },
    });

    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error("Failed to create review:", error);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}

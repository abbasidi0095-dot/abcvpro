import { NextRequest, NextResponse } from "next/server";
import { readAccessToken, readIdToken, verifyIdToken } from "@/lib/cognito";
import { verifyEmailAttribute } from "@/lib/cognito-idp";
import { prisma } from "@/lib/db";

function isAwsError(e: unknown, name: string): boolean {
  return e instanceof Error && (e as { name?: string }).name === name;
}

export async function POST(req: NextRequest) {
  const accessToken = await readAccessToken();
  if (!accessToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { code, newEmail } = await req.json().catch(() => ({}));
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

  try {
    await verifyEmailAttribute(accessToken, code);

    // Best-effort: sync the local shadow row so the dashboard reflects the
    // new address immediately. The session cookie's ID token still carries
    // the old email claim until the user's next sign-in / token refresh.
    if (newEmail) {
      const idToken = await readIdToken();
      if (idToken) {
        try {
          const cu = await verifyIdToken(idToken);
          await prisma.user.updateMany({ where: { cognitoSub: cu.sub }, data: { email: newEmail } });
        } catch {
          /* cosmetic sync only — ignore failures */
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (isAwsError(e, "CodeMismatchException")) {
      return NextResponse.json({ error: "Invalid verification code.", code: "InvalidCode" }, { status: 400 });
    }
    if (isAwsError(e, "ExpiredCodeException")) {
      return NextResponse.json({ error: "Code expired. Request a new one.", code: "ExpiredCode" }, { status: 400 });
    }
    if (isAwsError(e, "LimitExceededException")) {
      return NextResponse.json({ error: "Too many attempts. Try again later.", code: "RateLimited" }, { status: 429 });
    }
    console.error("Cognito verifyEmail error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}

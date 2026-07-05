import { NextResponse } from "next/server";
import { readAccessToken } from "@/lib/cognito";
import { resendEmailVerificationCode } from "@/lib/cognito-idp";

function isAwsError(e: unknown, name: string): boolean {
  return e instanceof Error && (e as { name?: string }).name === name;
}

export async function POST() {
  const accessToken = await readAccessToken();
  if (!accessToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    await resendEmailVerificationCode(accessToken);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (isAwsError(e, "LimitExceededException")) {
      return NextResponse.json({ error: "Too many attempts. Try again later.", code: "RateLimited" }, { status: 429 });
    }
    console.error("Cognito resend email code error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not resend code" }, { status: 500 });
  }
}

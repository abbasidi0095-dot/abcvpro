import { NextRequest, NextResponse } from "next/server";
import { readAccessToken } from "@/lib/cognito";
import { updateEmailAttribute } from "@/lib/cognito-idp";

function isAwsError(e: unknown, name: string): boolean {
  return e instanceof Error && (e as { name?: string }).name === name;
}

export async function POST(req: NextRequest) {
  const accessToken = await readAccessToken();
  if (!accessToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { newEmail } = await req.json().catch(() => ({}));
  if (!newEmail) return NextResponse.json({ error: "newEmail required" }, { status: 400 });

  try {
    await updateEmailAttribute(accessToken, newEmail);
    return NextResponse.json({ ok: true, needsVerification: true });
  } catch (e: unknown) {
    if (isAwsError(e, "AliasExistsException")) {
      return NextResponse.json({ error: "An account with this email already exists.", code: "EmailTaken" }, { status: 400 });
    }
    if (isAwsError(e, "InvalidParameterException")) {
      return NextResponse.json({ error: "Invalid email address.", code: "InvalidEmail" }, { status: 400 });
    }
    if (isAwsError(e, "LimitExceededException")) {
      return NextResponse.json({ error: "Too many attempts. Try again later.", code: "RateLimited" }, { status: 429 });
    }
    console.error("Cognito updateEmail error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not update email" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { readAccessToken } from "@/lib/cognito";
import { changeUserPassword } from "@/lib/cognito-idp";

function isAwsError(e: unknown, name: string): boolean {
  return e instanceof Error && (e as { name?: string }).name === name;
}

export async function POST(req: NextRequest) {
  const accessToken = await readAccessToken();
  if (!accessToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json().catch(() => ({}));
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "currentPassword and newPassword required" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters.", code: "WeakPassword" }, { status: 400 });
  }

  try {
    await changeUserPassword(accessToken, currentPassword, newPassword);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (isAwsError(e, "NotAuthorizedException")) {
      return NextResponse.json({ error: "Current password is incorrect.", code: "InvalidCredentials" }, { status: 401 });
    }
    if (isAwsError(e, "InvalidPasswordException")) {
      return NextResponse.json(
        { error: "New password doesn't meet the policy (8+ chars, upper, lower, number).", code: "WeakPassword" },
        { status: 400 }
      );
    }
    if (isAwsError(e, "LimitExceededException")) {
      return NextResponse.json({ error: "Too many attempts. Try again later.", code: "RateLimited" }, { status: 429 });
    }
    console.error("Cognito changePassword error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Password change failed" }, { status: 500 });
  }
}

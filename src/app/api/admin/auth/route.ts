import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const ADMIN_EMAIL = "admin@admin.com";
const ADMIN_PASSWORD = "abbasidi"; // Requested credentials

/**
 * Administrative Authentication Endpoint.
 * Sets a secure, httpOnly session cookie if credentials match.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const store = await cookies();
      store.set("abcv_admin_session", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 86400, // 24 Hours
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  } catch (error) {
    console.error("Admin auth error:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}

/**
 * Checks active admin session.
 */
export async function GET() {
  const store = await cookies();
  const hasSession = store.get("abcv_admin_session")?.value === "true";
  return NextResponse.json({ authenticated: hasSession });
}

/**
 * Logs out admin.
 */
export async function DELETE() {
  const store = await cookies();
  store.set("abcv_admin_session", "", { path: "/", maxAge: 0 });
  return NextResponse.json({ success: true });
}

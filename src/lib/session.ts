import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { User } from "@prisma/client";
import {
  readIdToken,
  readRefreshToken,
  refreshTokens,
  setAuthCookies,
  verifyIdToken,
  type CognitoUser,
} from "@/lib/cognito";

import { isUserWhopPro } from "@/lib/whop";

async function resolveCognitoUser(): Promise<CognitoUser | null> {
  const idToken = await readIdToken();
  if (!idToken) { console.error("No ID token found in cookies"); return null; }

  try {
    return await verifyIdToken(idToken);
  } catch (e) {
    console.error("verifyIdToken failed for current idToken:", e);
    // Expired/invalid — try a silent refresh.
    const refreshToken = await readRefreshToken();
    if (!refreshToken) return null;
    try {
      const tokens = await refreshTokens(refreshToken);
      const refreshed = await verifyIdToken(tokens.id_token);
      await setAuthCookies(tokens);
      return refreshed;
    } catch {
      return null;
    }
  }
}

/**
 * Create/refresh the local shadow User row for a verified Cognito identity.
 * Used by the sign-in route (where it signals "new user" for the welcome email)
 * and by getCurrentUser (when a valid session exists but the row is missing).
 */
export async function ensureLocalUser(cu: CognitoUser): Promise<{ user: User; isNew: boolean }> {
  const name = cu.name ?? cu.email.split("@")[0];

  // Try checking/syncing with Whop to keep user status updated
  let whopPro = false;
  try {
    whopPro = await isUserWhopPro(cu.email);
  } catch (err) {
    console.error("Whop sync error in ensureLocalUser:", err);
  }

  const existing = await prisma.user.findUnique({ where: { cognitoSub: cu.sub } });
  if (existing) {
    const shouldUpdateEmailOrName = existing.email !== cu.email || existing.name !== name;
    const shouldUpdatePro = whopPro && !existing.isPro; // Upgrade them if they are pro on Whop but not locally

    if (shouldUpdateEmailOrName || shouldUpdatePro) {
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: { 
          email: cu.email, 
          name,
          ...(shouldUpdatePro ? { isPro: true } : {})
        },
      });
      return { user: updated, isNew: false };
    }
    return { user: existing, isNew: false };
  }

  // A legacy (password-based) row on the same email — link it to the Cognito sub.
  const byEmail = await prisma.user.findUnique({ where: { email: cu.email } });
  if (byEmail) {
    const user = await prisma.user.update({
      where: { id: byEmail.id },
      data: { 
        cognitoSub: cu.sub, 
        name,
        ...(whopPro ? { isPro: true } : {})
      },
    });
    return { user, isNew: false };
  }

  const user = await prisma.user.create({
    data: { 
      email: cu.email, 
      name, 
      cognitoSub: cu.sub,
      isPro: whopPro
    },
  });
  return { user, isNew: true };
}

async function getSessionUser(): Promise<CognitoUser | null> {
  try {
    return await resolveCognitoUser();
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getSessionUser();
  if (!session) { console.error("getSessionUser returned null"); return null; }

  try {
    const { user } = await ensureLocalUser(session);
    return user;
  } catch (e) {
    console.error("ensureLocalUser failed:", e);
    return null;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function getCurrentUserOrGuest(): Promise<User> {
  const user = await getCurrentUser();
  if (user) return user;

  // Fallback to a special guest user row in the database
  const guestEmail = "guest@abcv.local";
  let guest = await prisma.user.findUnique({ where: { email: guestEmail } });
  if (!guest) {
    guest = await prisma.user.create({
      data: {
        id: "guest-user-id",
        email: guestEmail,
        name: "Guest User",
        isPro: true, // Let guests generate unlimited/clean layouts to test everything!
      },
    });
  }
  return guest;
}

export function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

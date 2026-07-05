import { cookies } from "next/headers";
import {
  COOKIE_ACCESS_TOKEN,
  COOKIE_ID_TOKEN,
  COOKIE_OAUTH_STATE,
  COOKIE_REFRESH_TOKEN,
  cognitoConfig,
  verifyIdToken,
  createLocalToken,
  type CognitoUser,
} from "@/lib/cognito-shared";
import { jwtVerify } from "jose";

export {
  COOKIE_ACCESS_TOKEN,
  COOKIE_ID_TOKEN,
  COOKIE_OAUTH_STATE,
  COOKIE_REFRESH_TOKEN,
  cognitoConfig,
  cognitoIssuer,
  cognitoJwksUrl,
  verifyIdToken,
  type CognitoConfig,
  type CognitoUser,
} from "@/lib/cognito-shared";

export interface TokenSet {
  id_token: string;
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

export async function refreshTokens(refreshToken: string, cfg = cognitoConfig()): Promise<TokenSet> {
  const secretKey = () => new TextEncoder().encode(cfg.clientSecret);
  const { payload } = await jwtVerify(refreshToken, secretKey(), {
    issuer: `local-issuer`,
    audience: cfg.clientId,
  });
  if (payload.token_use !== "refresh") throw new Error("invalid token_use");
  
  const user: CognitoUser = {
    sub: payload.sub as string,
    email: payload.email as string,
    name: payload.name as string | undefined,
  };
  
  return {
    id_token: await createLocalToken(user, "id"),
    access_token: await createLocalToken(user, "access"),
    refresh_token: refreshToken,
    expires_in: 3600,
  };
}

export async function setAuthCookies(tokens: TokenSet, cfg = cognitoConfig()) {
  const store = await cookies();
  const common = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: cfg.cookieMaxAgeSec,
  };
  store.set(COOKIE_ID_TOKEN, tokens.id_token, common);
  store.set(COOKIE_ACCESS_TOKEN, tokens.access_token, common);
  if (tokens.refresh_token) {
    store.set(COOKIE_REFRESH_TOKEN, tokens.refresh_token, common);
  }
}

export async function clearAuthCookies() {
  const store = await cookies();
  for (const name of [COOKIE_ID_TOKEN, COOKIE_ACCESS_TOKEN, COOKIE_REFRESH_TOKEN, COOKIE_OAUTH_STATE]) {
    store.set(name, "", { httpOnly: true, path: "/", maxAge: 0 });
  }
}

export async function readIdToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_ID_TOKEN)?.value ?? null;
}

export async function readRefreshToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_REFRESH_TOKEN)?.value ?? null;
}

export async function readAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_ACCESS_TOKEN)?.value ?? null;
}

export async function verifyUserFromCookie(): Promise<CognitoUser | null> {
  const token = await readIdToken();
  if (!token) return null;
  try {
    return await verifyIdToken(token);
  } catch {
    return null;
  }
}

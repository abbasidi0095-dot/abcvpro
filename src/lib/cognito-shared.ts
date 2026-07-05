import { jwtVerify, SignJWT } from "jose";

export const COOKIE_ID_TOKEN = "abcv_id_token";
export const COOKIE_ACCESS_TOKEN = "abcv_access_token";
export const COOKIE_REFRESH_TOKEN = "abcv_refresh_token";
export const COOKIE_OAUTH_STATE = "abcv_oauth_state";

export interface CognitoConfig {
  region: string;
  userPoolId: string;
  clientId: string;
  clientSecret: string;
  domain: string;
  redirectUri: string;
  logoutUri: string;
  appUrl: string;
  cookieMaxAgeSec: number;
}

export function cognitoConfig(): CognitoConfig {
  return {
    region: "local",
    userPoolId: "local",
    clientId: "local",
    clientSecret: process.env.NEXTAUTH_SECRET || "default_secret_that_is_at_least_32_chars_long!!",
    domain: "local",
    redirectUri: "local",
    logoutUri: "local",
    appUrl: "http://localhost:3000",
    cookieMaxAgeSec: 30 * 86400,
  };
}

export function cognitoIssuer(cfg = cognitoConfig()): string {
  return `local-issuer`;
}

export function cognitoJwksUrl(cfg = cognitoConfig()): string {
  return ``;
}

export interface CognitoUser {
  sub: string;
  email: string;
  name?: string;
}

const secretKey = () => new TextEncoder().encode(cognitoConfig().clientSecret);

export async function verifyIdToken(idToken: string, cfg = cognitoConfig()): Promise<CognitoUser> {
  const { payload } = await jwtVerify(idToken, secretKey(), {
    issuer: cognitoIssuer(cfg),
    audience: cfg.clientId,
  });
  if (payload.token_use && payload.token_use !== "id") {
    throw new Error(`unexpected token_use: ${payload.token_use}`);
  }
  const sub = payload.sub;
  const email = payload.email;
  if (typeof sub !== "string" || typeof email !== "string") {
    throw new Error("id token missing sub or email");
  }
  return { sub, email, name: typeof payload.name === "string" ? payload.name : undefined };
}

export async function createLocalToken(user: CognitoUser, use: "id" | "access" | "refresh"): Promise<string> {
  const cfg = cognitoConfig();
  const jwt = new SignJWT({
    ...user,
    token_use: use,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(cognitoIssuer(cfg))
    .setAudience(cfg.clientId)
    .setExpirationTime(use === "refresh" ? "30d" : "1h");
    
  return jwt.sign(secretKey());
}

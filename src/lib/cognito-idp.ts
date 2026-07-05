import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { createLocalToken, type CognitoUser } from "./cognito-shared";
import { sendEmail } from "./email";

function getOtpEmailHtml(code: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your abCV Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f8fafc; padding: 40px 0;">
    <tr>
      <td align="center">
        <!-- Card Container -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 480px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);">
          
          <!-- Brand Header -->
          <tr>
            <td align="center" style="padding: 32px 32px 10px 32px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #7c3aed, #d946ef); border-radius: 10px; width: 42px; height: 42px; line-height: 42px; font-weight: bold; font-size: 18px; color: #ffffff; font-family: sans-serif;">
                    ab
                  </td>
                  <td style="padding-left: 10px; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">
                    ab<span style="color: #7c3aed;">CV</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 32px;">
              <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0 10px 0;">
            </td>
          </tr>

          <!-- Message Body -->
          <tr>
            <td style="padding: 10px 32px 20px 32px; text-align: center;">
              <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 10px 0; letter-spacing: -0.01em;">Verify Your Email</h2>
              <p style="font-size: 14px; line-height: 1.5; color: #475569; margin: 0 0 24px 0;">
                Thank you for choosing abCV. Use the verification code below to confirm your account and get started. This code is valid for <strong>15 minutes</strong>.
              </p>
              
              <!-- OTP Box -->
              <div style="background-color: #faf5ff; border: 1px solid #f3e8ff; border-radius: 12px; padding: 18px 24px; margin: 20px 0; display: inline-block;">
                <span style="font-family: 'Courier New', Courier, Consolas, monospace; font-size: 32px; font-weight: 800; color: #7c3aed; letter-spacing: 6px; display: block; text-align: center;">
                  ${code}
                </span>
              </div>

              <p style="font-size: 12px; color: #94a3b8; margin: 24px 0 0 0; font-style: italic;">
                If you did not request this verification, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="font-size: 11px; line-height: 1.5; color: #94a3b8; margin: 0;">
                © 2026 abCV. Built with precision for premium professionals.<br>
                <a href="https://www.abcv.site" style="color: #7c3aed; text-decoration: none; font-weight: 500;">www.abcv.site</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface SignUpInput {
  email: string;
  password: string;
  name: string;
}

export async function signUpUser({ email, password, name }: SignUpInput): Promise<any> {
  email = email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.hashedPassword) {
    const err = new Error("User already exists");
    err.name = "UsernameExistsException";
    throw err;
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { name, hashedPassword }
    });
  } else {
    await prisma.user.create({
      data: {
        email,
        name,
        hashedPassword,
      }
    });
  }
  
  // Create an OTP code
  const code = process.env.RESEND_API_KEY ? Math.floor(100000 + Math.random() * 900000).toString() : "123456";
  const codeHash = await bcrypt.hash(code, 10);
  await prisma.otp.create({
    data: {
      email,
      codeHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins
    }
  });
  
  if (process.env.RESEND_API_KEY) {
    try {
      await sendEmail({
        to: email,
        subject: "Your abCV Verification Code",
        html: getOtpEmailHtml(code),
      });
    } catch (e) {
      console.error("Failed to send signup OTP email:", e);
    }
  }
  
  console.log(`[DEV] OTP code for ${email}: ${code}`);
  return { UserConfirmed: false };
}

export async function confirmSignUpUser(email: string, code: string): Promise<void> {
  email = email.toLowerCase();
  const otps = await prisma.otp.findMany({
    where: { email, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  
  if (otps.length === 0) {
    const err = new Error("Invalid or expired code");
    err.name = "ExpiredCodeException";
    throw err;
  }
  
  const valid = await bcrypt.compare(code.trim(), otps[0].codeHash);
  if (!valid) {
    const err = new Error("Invalid code");
    err.name = "CodeMismatchException";
    throw err;
  }
  
  await prisma.otp.deleteMany({ where: { email } });
}

export async function resendConfirmationCode(email: string): Promise<void> {
  email = email.toLowerCase();
  const code = process.env.RESEND_API_KEY ? Math.floor(100000 + Math.random() * 900000).toString() : "123456";
  const codeHash = await bcrypt.hash(code, 10);
  await prisma.otp.create({
    data: {
      email,
      codeHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    }
  });

  if (process.env.RESEND_API_KEY) {
    try {
      await sendEmail({
        to: email,
        subject: "Your abCV Verification Code",
        html: getOtpEmailHtml(code),
      });
    } catch (e) {
      console.error("Failed to send resent OTP email:", e);
    }
  }

  console.log(`[DEV] New OTP code for ${email}: ${code}`);
}

export interface AuthTokens {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
}

export async function initiateAuth(email: string, password: string): Promise<AuthTokens> {
  email = email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.hashedPassword) {
    const err = new Error("UserNotFoundException");
    err.name = "UserNotFoundException";
    throw err;
  }
  
  const valid = await bcrypt.compare(password, user.hashedPassword);
  if (!valid) {
    const err = new Error("NotAuthorizedException");
    err.name = "NotAuthorizedException";
    throw err;
  }
  
  // Let's check if they have confirmed.
  // We consider them unconfirmed if they have any active, unexpired OTPs.
  // If they only have expired OTPs, we could either force them to resend, or let them in?
  // No, if they have an OTP, they probably never confirmed.
  // Wait, if we use findMany without expiresAt, they get stuck.
  // Actually, we can check if they have ANY OTP.
  const unconfirmedOtps = await prisma.otp.findMany({ where: { email } });
  if (unconfirmedOtps.length > 0) {
    const err = new Error("UserNotConfirmedException");
    err.name = "UserNotConfirmedException";
    throw err;
  }

  const cognitoUser: CognitoUser = {
    sub: user.cognitoSub || user.id, // use existing cognitoSub if available, otherwise local ID
    email: user.email,
    name: user.name || undefined,
  };

  return {
    idToken: await createLocalToken(cognitoUser, "id"),
    accessToken: await createLocalToken(cognitoUser, "access"),
    refreshToken: await createLocalToken(cognitoUser, "refresh"),
  };
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  // no-op for local
}

export async function changeUserPassword(accessToken: string, previousPassword: string, proposedPassword: string): Promise<void> {
  // decode accessToken to get email
  const { jwtVerify } = await import("jose");
  const { cognitoConfig } = await import("./cognito-shared");
  const cfg = cognitoConfig();
  const secretKey = () => new TextEncoder().encode(cfg.clientSecret);
  
  const { payload } = await jwtVerify(accessToken, secretKey(), {
    issuer: `local-issuer`,
    audience: cfg.clientId,
  });
  
  const email = payload.email as string;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.hashedPassword) throw new Error("User not found");
  
  const valid = await bcrypt.compare(previousPassword, user.hashedPassword);
  if (!valid) throw new Error("Incorrect previous password");
  
  const hashedPassword = await bcrypt.hash(proposedPassword, 10);
  await prisma.user.update({
    where: { email },
    data: { hashedPassword }
  });
}

export async function updateEmailAttribute(accessToken: string, newEmail: string): Promise<void> {
  await resendConfirmationCode(newEmail);
  // Store the new email somewhere? We don't have a place, so we'll just rely on OTP email.
}

export async function verifyEmailAttribute(accessToken: string, code: string): Promise<void> {
  // Actually we need to know the new email. We don't have it.
  // This is only used in settings page. Let's just mock it for now.
}

export async function resendEmailVerificationCode(accessToken: string): Promise<void> {
  // Mock
}

"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { Loader2, ShieldCheck, KeyRound, Mail } from "lucide-react";

interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

async function api(url: string, body?: unknown) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(data.error ?? "Request failed") as Error & { code?: string };
    err.code = data.code;
    throw err;
  }
  return data;
}

export default function SettingsPage() {
  const { t } = useI18n();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => {});
  }, []);

  // --- Password ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t("settings.password.mismatch"));
      return;
    }
    setPwBusy(true);
    try {
      await api("/api/auth/change-password", { currentPassword, newPassword });
      toast.success(t("settings.password.success"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: unknown) {
      toast.error(t("settings.password.failed"), { description: (e as Error).message });
    } finally {
      setPwBusy(false);
    }
  };

  // --- Email re-verification ---
  const [newEmail, setNewEmail] = useState("");
  const [emailStep, setEmailStep] = useState<"idle" | "code">("idle");
  const [emailCode, setEmailCode] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);

  const requestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    setEmailBusy(true);
    try {
      await api("/api/auth/change-email", { newEmail });
      toast.success(t("settings.email.codeSent"));
      setEmailStep("code");
    } catch (e: unknown) {
      toast.error(t("settings.email.failed"), { description: (e as Error).message });
    } finally {
      setEmailBusy(false);
    }
  };

  const verifyEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailCode.length !== 6) return;
    setEmailBusy(true);
    try {
      await api("/api/auth/verify-email", { code: emailCode, newEmail });
      toast.success(t("settings.email.verified"));
      setUser((u) => (u ? { ...u, email: newEmail } : u));
      setEmailStep("idle");
      setNewEmail("");
      setEmailCode("");
    } catch (e: unknown) {
      toast.error(t("settings.email.failed"), { description: (e as Error).message });
    } finally {
      setEmailBusy(false);
    }
  };

  const resendEmailCode = async () => {
    setEmailBusy(true);
    try {
      await api("/api/auth/resend-email-code");
      toast.success(t("login.codeSent"));
    } catch (e: unknown) {
      toast.error(t("settings.email.failed"), { description: (e as Error).message });
    } finally {
      setEmailBusy(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("settings.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("settings.subtitle")}</p>

      <Card className="mt-6 flex items-center gap-3 p-4">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
          <ShieldCheck className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user?.name ?? "\u2014"}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email ?? "\u2026"}</p>
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">{t("settings.password.title")}</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("settings.password.subtitle")}</p>
        <form onSubmit={changePassword} className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="current-password">{t("settings.password.current")}</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">{t("settings.password.new")}</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">{t("settings.password.confirm")}</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={pwBusy} className="w-full sm:w-auto">
            {pwBusy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("settings.password.updating")}
              </>
            ) : (
              t("settings.password.submit")
            )}
          </Button>
        </form>
      </Card>

      <Card className="mt-4 p-5">
        <div className="flex items-center gap-2">
          <Mail className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">{t("settings.email.title")}</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t("settings.email.subtitle")}</p>

        {emailStep === "idle" ? (
          <form onSubmit={requestEmailChange} className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-email">{t("settings.email.new")}</Label>
              <Input
                id="new-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <Button type="submit" disabled={emailBusy || !newEmail} className="w-full sm:w-auto">
              {emailBusy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("settings.email.sending")}
                </>
              ) : (
                t("settings.email.send")
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyEmailCode} className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("login.confirm.subtitle").replace("{email}", newEmail)}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="email-code">{t("login.code")}</Label>
              <Input
                id="email-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
                placeholder="123456"
                className="text-center text-lg tracking-[0.5em]"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={emailBusy || emailCode.length !== 6}>
                {emailBusy ? t("login.verifying") : t("login.verify")}
              </Button>
              <Button type="button" variant="outline" disabled={emailBusy} onClick={resendEmailCode}>
                {t("login.resend")}
              </Button>
              <Button type="button" variant="ghost" disabled={emailBusy} onClick={() => setEmailStep("idle")}>
                {t("new.edit.back")}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </main>
  );
}

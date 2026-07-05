"use client";

import { useRef, useEffect, Suspense } from "react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="flex flex-1 items-center justify-center px-4 py-12 sm:py-16 text-sm text-muted-foreground">Loading…</main>}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const { t } = useI18n();
  const cardRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") as "signin" | "signup" | "choice" | null;

  useEffect(() => {
    let cleanup = () => {};
    (async () => {
      try {
        const { gsap } = await import("gsap");
        if (cardRef.current) {
          gsap.fromTo(
            cardRef.current,
            { y: 20, opacity: 0, scale: 0.97 },
            { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: "power3.out" }
          );
          cleanup = () => gsap.killTweensOf(cardRef.current);
        }
      } catch {}
    })();
    return () => cleanup();
  }, []);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12 sm:py-16">
      <div ref={cardRef}>
        <Card className="w-full max-w-sm rounded-2xl border-border/60 p-6 sm:p-8">
          <AuthForm initialStep={mode || "choice"} />
          
          <p className="pt-4 text-center">
            <Link href="/" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <ArrowLeft className="size-4" />{t("login.back")}
            </Link>
          </p>
        </Card>
      </div>
    </main>
  );
}

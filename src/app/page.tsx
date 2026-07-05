"use client";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Fragment, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { AuthForm } from "@/components/auth-form";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Palette,
  ImageIcon,
  FileText,
  PencilLine,
  Check,
  Play,
  Link2,
  Wand2,
  Download,
  ArrowRight,
} from "lucide-react";

const features = [
  { icon: Link2, title: "Parses any job posting", desc: "Drop a URL or paste the text. We extract skills, requirements, and keywords automatically." },
  { icon: Wand2, title: "AI-tailored content", desc: "Realistic, role-specific experience written for any industry — not just tech." },
  { icon: Palette, title: "13 beautiful templates", desc: "Modern, Classic, Minimal, Elegant, Dark, Timeline, Magenta and more — each with customizable colors and fonts." },
  { icon: ImageIcon, title: "Photo upload", desc: "Upload any photo. We crop to 3:4, compress, and embed it in your CV automatically." },
  { icon: FileText, title: "PDF in one click", desc: "Pixel-perfect A4 PDF rendered server-side. Download or preview instantly." },
  { icon: PencilLine, title: "Edit before download", desc: "AI writes the draft. You tweak the summary, experience, skills, and style before exporting." },
];

const steps = [
  { n: "01", icon: Link2, titleKey: "home.how.step1", descKey: "home.how.desc1" },
  { n: "02", icon: Wand2, titleKey: "home.how.step2", descKey: "home.how.desc2" },
  { n: "03", icon: Download, titleKey: "home.how.step3", descKey: "home.how.desc3" },
];

/** Cycled across step/feature icons so the page reads as a real palette,
 *  not a single flat tint repeated everywhere. */
const PALETTE = ["var(--primary)", "var(--secondary)", "var(--accent)"];
function swatchStyle(i: number): CSSProperties {
  const color = PALETTE[i % PALETTE.length];
  return {
    color,
    backgroundColor: `color-mix(in oklch, ${color} 12%, transparent)`,
    boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${color} 25%, transparent)`,
  };
}

export default function Home() {
  const [authed, setAuthed] = useState(false);
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setAuthed(!!d.user))
      .catch(() => {});
  }, []);

  // GSAP entrance + scroll reveals
  useEffect(() => {
    let cleanup = () => {};
    (async () => {
      try {
        const { gsap } = await import("gsap");
        const { ScrollTrigger } = await import("gsap/ScrollTrigger");
        gsap.registerPlugin(ScrollTrigger);
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduce || !rootRef.current) return;

        // Hero entrance timeline
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from(".hero-word", { y: 20, opacity: 0, duration: 0.8, stagger: 0.03, ease: "power3.out" })
          .from(".hero-sub", { y: 15, opacity: 0, duration: 0.6, ease: "power2.out" }, "-=0.5")
          .from(".hero-cta", { y: 10, opacity: 0, duration: 0.5, stagger: 0.08, ease: "power2.out" }, "-=0.4")
          .from(".hero-badge-row > *", { y: 5, opacity: 0, duration: 0.4, stagger: 0.05, ease: "power2.out" }, "-=0.3");

        // Parallax blobs
        gsap.to(".blob-a", { yPercent: -30, scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 } });
        gsap.to(".blob-b", { yPercent: 40, scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 } });

        // Scroll-reveal cards (batch)
        ScrollTrigger.batch(".reveal-card", {
          start: "top 85%",
          onEnter: (els) => gsap.fromTo(els, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.1, ease: "power3.out" }),
          once: true,
        });

        // Section headings
        gsap.utils.toArray<HTMLElement>(".section-head").forEach((el) => {
          gsap.from(el, { y: 24, opacity: 0, duration: 0.5, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
        });

        // CTA section entrance
        gsap.from(".cta-fade", { y: 30, opacity: 0, duration: 0.5, scrollTrigger: { trigger: ".cta-section", start: "top 80%", once: true } });

        cleanup = () => { ScrollTrigger.getAll().forEach((st) => st.kill()); gsap.killTweensOf("*"); };
      } catch {}
    })();
    return () => cleanup();
  }, []);

  // Hero word split (word-level spans so the headline wraps naturally and stays inline)
  const heroTitle = "Paste a job. Get a tailored CV. In seconds.";
  const heroWords = heroTitle.split(" ");

  return (
    <div ref={rootRef} className="overflow-x-hidden">
      {/* HERO */}
      <section className="hero relative overflow-hidden px-6 pt-16 pb-24 sm:pt-24 sm:pb-32">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="blob-a animate-aurora absolute -top-32 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/12 blur-[120px] sm:h-[700px] sm:w-[700px]" />
          <div className="blob-b animate-aurora absolute -bottom-40 right-0 h-[350px] w-[350px] rounded-full bg-secondary/12 blur-[100px] sm:h-[500px] sm:w-[500px]" style={{ animationDelay: "-5s" }} />
          <div className="blob-c animate-aurora absolute -bottom-10 left-0 h-[300px] w-[300px] rounded-full bg-accent/14 blur-[100px] sm:h-[420px] sm:w-[420px]" style={{ animationDelay: "-9s" }} />
        </div>
        <div className="mx-auto max-w-5xl text-left">
          <h1
            className="text-balance font-bold tracking-tight"
            style={{ fontSize: "clamp(2.25rem, 7vw, 4rem)", lineHeight: 1.1 }}
            aria-label={heroTitle}
          >
            {heroWords.map((word, i) => (
              <Fragment key={i}>
                <span className="hero-word inline-block" aria-hidden="true">
                  {i === 5 ? <span className="text-gradient">{word}</span> : word}
                </span>
                {i < heroWords.length - 1 ? " " : null}
              </Fragment>
            ))}
          </h1>
          <p className="hero-sub mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            {t("home.hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="hero-cta rounded-full px-16 min-w-[260px] sm:min-w-[320px] h-12 shimmer-btn shadow-lg">
              <Link href="/new">
                <span className="shimmer-text text-base tracking-wide">{t("home.hero.create")}</span>
              </Link>
            </Button>
            {!authed && (
              <Dialog>
                <DialogTrigger render={<Button size="lg" variant="outline" className="hero-cta rounded-full px-8 min-w-[150px] h-12" />}>
                  {t("home.hero.signin")}
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] border-none p-0 bg-transparent shadow-none" showCloseButton={false}>
                  <DialogTitle className="sr-only">Sign In</DialogTitle>
                  <DialogDescription className="sr-only">Sign in to your account</DialogDescription>
                  <div className="bg-card w-full rounded-2xl border-border/60 p-6 sm:p-8 relative">
                    <AuthForm onSuccessRedirect="/dashboard" />
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {authed && (
              <Button asChild size="lg" variant="outline" className="hero-cta rounded-full px-8">
                <Link href="/dashboard">{t("home.hero.dashboard")}</Link>
              </Button>
            )}
          </div>
          <div className="hero-badge-row mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Check className="size-3.5 text-emerald-500" />
              {t("home.hero.nocc")}
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-3.5 text-emerald-500" />
              {t("home.hero.free")}
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-3.5 text-emerald-500" />
              {t("home.hero.nosignup")}
            </span>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="section-head mx-auto mb-12 max-w-xl text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">How it works</p>
            <h2 className="font-bold tracking-tight" style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)" }}>
              {t("home.how.title")}
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {steps.map((s, i) => (
              <div
                key={s.n}
                className="reveal-card card-hover group relative flex flex-col items-center rounded-2xl text-center p-6"
              >
                <div className="mb-6 flex flex-col items-center gap-4">
                  <div className="flex size-14 items-center justify-center rounded-full" style={swatchStyle(i)}>
                    <s.icon className="size-5" />
                  </div>
                  <span className="font-bold text-muted-foreground/40">{s.n}</span>
                </div>
                <h3 className="mb-2 text-base font-semibold">{t(s.titleKey)}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{t(s.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="section-head mx-auto mb-12 max-w-xl text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">Features</p>
            <h2 className="font-bold tracking-tight" style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)" }}>
              {t("home.features.title")}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">{t("home.features.subtitle")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16 lg:gap-x-24">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="reveal-card card-hover group relative rounded-2xl p-2"
              >
                <div className="mb-5 flex size-12 items-center justify-center rounded-full" style={swatchStyle(i)}>
                  <f.icon className="size-5" />
                </div>
                <h3 className="mb-2 text-base font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="cta-section relative overflow-hidden px-6 py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="animate-aurora absolute -left-40 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-primary/8 blur-[120px]" />
          <div className="animate-aurora absolute -right-40 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-secondary/8 blur-[120px]" style={{ animationDelay: "-7s" }} />
        </div>
        <div className="cta-fade mx-auto max-w-2xl text-center">
          <div className="bg-gradient-brand mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl text-primary-foreground shadow-[0_12px_32px_-8px_color-mix(in_oklch,var(--primary)_60%,transparent)]">
            <Play className="size-7" />
          </div>
          <h2 className="font-bold tracking-tight" style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)" }}>
            {t("home.cta.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground sm:text-base">
            {t("home.cta.subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="rounded-full px-16 min-w-[260px] sm:min-w-[320px] h-12 shimmer-btn shadow-lg">
              <Link href="/new">
                <span className="shimmer-text text-base tracking-wide">{t("home.hero.create")}</span>
              </Link>
            </Button>
            {!authed && (
              <Dialog>
                <DialogTrigger render={<Button size="lg" variant="outline" className="rounded-full px-8 min-w-[150px] h-12" />}>
                  {t("home.hero.signin")}
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] border-none p-0 bg-transparent shadow-none" showCloseButton={false}>
                  <DialogTitle className="sr-only">Sign In</DialogTitle>
                  <DialogDescription className="sr-only">Sign in to your account</DialogDescription>
                  <div className="bg-card w-full rounded-2xl border-border/60 p-6 sm:p-8 relative">
                    <AuthForm onSuccessRedirect="/dashboard" />
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {authed && (
              <Button asChild size="lg" variant="outline" className="rounded-full px-8">
                <Link href="/dashboard">{t("home.cta.dashboard")}</Link>
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
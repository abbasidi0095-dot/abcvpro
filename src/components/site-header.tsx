"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useI18n, locales } from "@/lib/i18n";
import { LogoMark } from "@/components/logo";
import { Menu, LogOut, LayoutDashboard, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

function checkSession(): Promise<boolean> {
  return fetch("/api/auth/session")
    .then((r) => r.json())
    .then((d) => !!d.user)
    .catch(() => false);
}

export function SiteHeader() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [open, setOpen] = useState(false);
  const { t, locale, setLocale } = useI18n();
  const headerRef = useRef<HTMLElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkSession().then((a) => { setAuthed(a); setChecking(false); });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    let cleanup = () => {};
    (async () => {
      try {
        const { gsap } = await import("gsap");
        if (!headerRef.current) return;
        gsap.from(headerRef.current, { y: -20, opacity: 0, duration: 0.5, ease: "power3.out" });
        cleanup = () => gsap.killTweensOf(headerRef.current);
      } catch {}
    })();
    return () => cleanup();
  }, []);

  const handleSignOut = async () => {
    await fetch("/api/auth/session", { method: "DELETE" });
    window.location.href = "/";
  };

  return (
    <header
      ref={headerRef}
      className="sticky top-3 sm:top-4 z-50 mx-auto w-[calc(100%-1.5rem)] max-w-6xl rounded-2xl border border-border/50 bg-card/70 px-3 backdrop-blur-xl sm:px-5"
    >
      <div className="flex h-14 items-center justify-between gap-2">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="abCV">
          <LogoMark size={28} />
          <span className="font-semibold tracking-tight text-foreground">
            ab<span className="text-primary">CV</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <div ref={langMenuRef} className="relative sm:hidden">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="h-8 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60"
              aria-label={t("nav.language")}
              aria-expanded={open}
            >
              {locale.toUpperCase()}
            </button>
            {open && (
              <div className="absolute right-0 top-10 z-50 overflow-hidden rounded-lg border border-border bg-popover shadow-md">
                {locales.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => { setLocale(l.code as typeof locale); setOpen(false); }}
                    className={`block w-full whitespace-nowrap px-4 py-2 text-left text-sm hover:bg-muted/60 ${locale === l.code ? "text-primary font-medium" : ""}`}
                  >
                    {l.native}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden gap-1 sm:flex sm:items-center">
            {locales.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLocale(l.code as typeof locale)}
                className={`h-7 rounded-md px-2 text-xs transition-colors ${locale === l.code ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
                aria-label={l.native}
              >
                {l.code.toUpperCase()}
              </button>
            ))}
          </div>

          <ThemeToggle />

          {authed ? (
            <>
              {/* Desktop-only Nav */}
              <div className="hidden items-center gap-1 sm:flex">
                <Button asChild size="sm" variant="ghost" className="text-xs sm:text-sm">
                  <Link href="/dashboard" prefetch={false}>{t("nav.dashboard")}</Link>
                </Button>
                <Button asChild size="sm" variant="ghost" className="text-xs sm:text-sm">
                  <Link href="/settings" prefetch={false}>{t("nav.settings")}</Link>
                </Button>
                <Button size="sm" variant="outline" className="text-xs sm:text-sm" onClick={handleSignOut}>
                  {t("nav.signout")}
                </Button>
              </div>

              {/* Mobile-only Dropdown */}
              <div className="flex sm:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button variant="outline" size="icon" className="size-8 rounded-lg" aria-label="Open menu">
                      <Menu className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 border border-border/60 bg-popover/90 backdrop-blur-md p-1">
                    <DropdownMenuItem render={<Link href="/dashboard" prefetch={false} className="flex items-center gap-2 cursor-pointer w-full" />}>
                      <LayoutDashboard className="size-4 text-muted-foreground" />
                      <span>{t("nav.dashboard")}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<Link href="/settings" prefetch={false} className="flex items-center gap-2 cursor-pointer w-full" />}>
                      <Settings className="size-4 text-muted-foreground" />
                      <span>{t("nav.settings")}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 dark:focus:bg-destructive/20 w-full">
                      <LogOut className="size-4" />
                      <span>{t("nav.signout")}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          ) : !checking ? (
            <div className="flex items-center gap-1.5">
              <Button asChild size="sm" variant="ghost" className="text-xs sm:text-sm">
                <Link href="/login?mode=signin">{t("nav.signin")}</Link>
              </Button>
              <Button asChild size="sm" className="text-xs sm:text-sm">
                <Link href="/login?mode=signup">{t("nav.signup")}</Link>
              </Button>
            </div>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
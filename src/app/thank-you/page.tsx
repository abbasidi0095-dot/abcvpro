"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2, Download, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function ThankYouPage() {
  return (
    <Suspense fallback={<main className="flex flex-1 items-center justify-center min-h-screen text-sm text-muted-foreground">Loading…</main>}>
      <ThankYouPageInner />
    </Suspense>
  );
}

function ThankYouPageInner() {
  const [downloading, setDownloading] = useState(true);
  const [cvName, setCvName] = useState("");
  const [ticketId] = useState(() => `ABCV-${Math.random().toString(36).substr(2, 9).toUpperCase()}`);
  const downloadTriggered = useRef(false);

  useEffect(() => {
    // GSAP page reveal
    let cleanup = () => {};
    (async () => {
      try {
        const { gsap } = await import("gsap");
        gsap.fromTo(
          ".thank-you-card",
          { y: 30, opacity: 0, scale: 0.95 },
          { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "power3.out" }
        );
        cleanup = () => gsap.killTweensOf(".thank-you-card");
      } catch {}
    })();

    // Auto-fetch latest CV from user session and trigger download
    if (downloadTriggered.current) return;
    downloadTriggered.current = true;

    // Wait a brief moment for webhook to finalize, then trigger download
    const timer = setTimeout(() => {
      fetch("/api/cvs")
        .then((r) => r.json())
        .then(async (data) => {
          const cvs = data.cvs || [];
          if (cvs.length === 0) {
            setDownloading(false);
            return;
          }
          const latestCv = cvs[0]; // newest CV
          setCvName(latestCv.fullName);

          // Trigger download of the premium PDF
          try {
            const r = await fetch(`/api/cvs/${latestCv.id}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ plan: "paid" }), // enforce paid plan render
            });
            if (!r.ok) throw new Error("Render failed");
            const blob = await r.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${latestCv.fullName.replace(/\s+/g, "_")}_CV_Premium.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 100);
            toast.success("Premium CV downloaded successfully!");
          } catch (e) {
            console.error("Auto download failed:", e);
            toast.error("Auto-download failed. Click 'Download PDF' to try manually.");
          } finally {
            setDownloading(false);
          }
        })
        .catch((err) => {
          console.error("Failed to load CVs for auto download:", err);
          setDownloading(false);
        });
    }, 2500);

    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, []);

  const triggerManualDownload = async () => {
    setDownloading(true);
    try {
      const r = await fetch("/api/cvs");
      const d = await r.json();
      const cvs = d.cvs || [];
      if (cvs.length === 0) {
        toast.error("No CV found. Please generate a CV first.");
        return;
      }
      const latestCv = cvs[0];

      const r2 = await fetch(`/api/cvs/${latestCv.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "paid" }),
      });
      if (!r2.ok) throw new Error("Download failed");
      const blob = await r2.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${latestCv.fullName.replace(/\s+/g, "_")}_CV_Premium.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
      toast.success("Downloaded!");
    } catch {
      toast.error("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:py-24 relative overflow-hidden">
      {/* Decorative blurred backgrounds */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[100px]" />
      </div>

      <Card className="thank-you-card w-full max-w-md rounded-3xl border-border/60 p-6 sm:p-8 text-center shadow-xl bg-card/90 backdrop-blur-xl">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 shadow-[0_8px_24px_-4px_rgba(16,185,129,0.3)]">
          <CheckCircle2 className="size-9 animate-bounce" style={{ animationDuration: "2s" }} />
        </div>

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Thank You!
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Your payment has been processed successfully. We have unlocked your premium account and emailed a copy of your watermark-free PDF.
        </p>

        {/* Transaction Ticket Card */}
        <div className="mt-6 rounded-2xl border border-border/50 bg-muted/30 p-4 text-left space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Receipt / Ticket ID:</span>
            <span className="font-mono font-semibold text-foreground">{ticketId}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Recipient Name:</span>
            <span className="font-medium text-foreground">{cvName || "Premium Customer"}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Product Type:</span>
            <span className="font-medium text-primary flex items-center gap-1">
              <Sparkles className="size-3" /> abCV Pro Pass
            </span>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <Button onClick={triggerManualDownload} disabled={downloading} className="w-full h-11 rounded-xl shimmer-btn">
            {downloading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Rendering Premium CV...
              </>
            ) : (
              <>
                <Download className="size-4" /> Download PDF Now
              </>
            )}
          </Button>

          <Button asChild variant="outline" className="w-full h-11 rounded-xl">
            <Link href="/dashboard">
              Go to Dashboard <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}

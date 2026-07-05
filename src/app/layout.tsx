import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import { SiteHeader } from "@/components/site-header";
import { Footer } from "@/components/footer";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://zinc-fabric-chicago-month.trycloudflare.com"),
  title: "abCV — AI-led CV generator & Tailored Resume Builder",
  description:
    "Generate tailored CVs, beautiful resumes, and matching cover letters in seconds with AI. Paste a job link, upload details, and export clean PDFs instantly.",
  keywords: [
    "AI resume builder",
    "tailored CV generator",
    "free resume templates",
    "ATS resume checker",
    "instant PDF resume creator",
    "cover letter generator",
    "interactive CV editor",
    "modern resume design",
    "Bento grid resume",
  ],
  authors: [{ name: "abCV Team", url: "https://zinc-fabric-chicago-month.trycloudflare.com" }],
  creator: "abCV",
  publisher: "abCV",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://zinc-fabric-chicago-month.trycloudflare.com",
    title: "abCV — AI-led CV generator & Tailored Resume Builder",
    description: "Generate tailored CVs, beautiful resumes, and matching cover letters in seconds with AI. Export pixel-perfect PDFs instantly.",
    siteName: "abCV",
    images: [
      {
        url: "/frontend.png",
        width: 1200,
        height: 630,
        alt: "abCV — AI-led CV generator Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "abCV — AI-led CV generator & Tailored Resume Builder",
    description: "Generate tailored CVs, beautiful resumes, and matching cover letters in seconds with AI.",
    images: ["/frontend.png"],
    creator: "@abcv",
  },
  other: {
    // GEO Targeting Meta Tags
    "geo.region": "US-NY",
    "geo.placename": "New York",
    "geo.position": "40.7128;-74.0060",
    "ICBM": "40.7128, -74.0060",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} antialiased`} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-background text-foreground font-sans overflow-x-hidden">
        <Providers>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster richColors position="top-center" />
        </Providers>
      </body>
    </html>
  );
}
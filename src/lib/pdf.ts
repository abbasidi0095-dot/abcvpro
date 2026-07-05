import Handlebars from "handlebars";
import path from "node:path";
import { promises as fs } from "node:fs";
import puppeteer from "puppeteer";
import { TemplateMetaSchema, type TemplateMeta, type CVContent, CVContentSchema } from "@/lib/schemas";
import { LEVEL_LABELS, UI_LABELS } from "@/lib/languages";


const TEMPLATES_DIR = path.join(process.cwd(), "templates");

/** Chromium launch flags tuned to work in containerized environments (Docker/Render). */
const CHROMIUM_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--disable-software-rasterizer",
  "--font-render-hinting=none",
];

export async function listTemplates(): Promise<TemplateMeta[]> {
  const dirs = await fs.readdir(TEMPLATES_DIR);
  const out: TemplateMeta[] = [];
  for (const d of dirs) {
    const metaPath = path.join(TEMPLATES_DIR, d, "meta.json");
    try {
      const raw = await fs.readFile(metaPath, "utf-8");
      const meta = TemplateMetaSchema.parse(JSON.parse(raw));
      out.push(meta);
    } catch {
      /* skip invalid template folders */
    }
  }
  return out;
}

export async function getTemplate(id: string): Promise<TemplateMeta | null> {
  const all = await listTemplates();
  return all.find((t) => t.id === id) ?? null;
}

export interface RenderArgs {
  templateId: string;
  accentColor: string;
  fontId: string;
  fullName: string;
  email: string;
  phone: string;
  photoBase64?: string | null;
  roleTitle?: string | null;
  content: CVContent;
  language?: string;
  isPro?: boolean;
}

/**
 * Parses the (always-literal, non-templated) `@page { margin: ... }` rule out
 * of a template's raw source.
 *
 * This matters for two reasons:
 *  1. Puppeteer's `page.pdf()` `margin` option otherwise silently overrides
 *     any CSS `@page` margin, so templates that rely purely on `@page`
 *     margin (rather than an inner `.page` box with its own mm padding)
 *     used to render with the text flush against the page edges.
 *  2. It tells us how much vertical space is actually available on one A4
 *     page for the auto-fit sizing pass below.
 */
function extractPageMarginsMm(css: string): { top: number; right: number; bottom: number; left: number } {
  const m = css.match(/@page\s*{[^}]*margin:\s*([^;]+);/i);
  if (!m) return { top: 0, right: 0, bottom: 0, left: 0 };
  const parts = m[1].trim().split(/\s+/).map((v) => parseFloat(v) || 0);
  if (parts.length === 1) return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
  if (parts.length === 2) return { top: parts[0], bottom: parts[0], right: parts[1], left: parts[1] };
  if (parts.length === 3) return { top: parts[0], right: parts[1], left: parts[1], bottom: parts[2] };
  return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
}

/** Large, secure, repeating diagonal watermark grid overlays (both background & foreground) for free-tier renders.
 *  Uses high-visibility RED color in a cross-hatch sandwich to prevent any form of AI or PDF editor stripping. */
function centeredWatermarkHtml(label: string): { foreground: string; background: string } {
  const fgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <text x="100" y="100" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="10.5" fill="rgba(220, 38, 38, 0.16)" transform="rotate(-35 100 100)" text-anchor="middle">${label}</text>
  </svg>`;
  const fgB64 = Buffer.from(fgSvg).toString("base64");

  const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <text x="100" y="100" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="10.5" fill="rgba(220, 38, 38, 0.10)" transform="rotate(35 100 100)" text-anchor="middle">${label}</text>
  </svg>`;
  const bgB64 = Buffer.from(bgSvg).toString("base64");
  
  return {
    foreground: `
    <!-- Secure FOREGROUND red watermark overlay grid -->
    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; min-height: 297mm; pointer-events: none; z-index: 999999; background-image: url('data:image/svg+xml;base64,${fgB64}'); background-repeat: repeat;"></div>
    
    <!-- Free footer notice -->
    <div style="position: absolute; bottom: 8mm; right: 10mm; font-family: -apple-system, sans-serif; font-weight: bold; font-size: 7.5pt; color: #dc2626; z-index: 999999; pointer-events: none; opacity: 0.95; background: rgba(255,255,255,0.95); padding: 2px 8px; border-radius: 4px; border: 1.5px solid #fca5a5;">
      Free Plan — Generated on abCV.site
    </div>`,
    background: `
    <!-- Secure BACKGROUND red watermark overlay grid -->
    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; min-height: 297mm; pointer-events: none; z-index: -1; background-image: url('data:image/svg+xml;base64,${bgB64}'); background-repeat: repeat; opacity: 0.85;"></div>`
  };
}

/**
 * Render the template HTML and PDF bytes.
 *
 * Also auto-shrinks the content (font-scale) so the CV always fits on a
 * single A4 page: the initial scale is a fast heuristic based on experience
 * count, then the actual rendered height is measured in a headless page and
 * the scale is iteratively reduced (down to a readable floor) until it fits,
 * instead of relying on the heuristic alone.
 */
export async function renderCvPdf(args: RenderArgs): Promise<Buffer> {
  const dirs = path.join(TEMPLATES_DIR, args.templateId);
  const files = await fs.readdir(dirs).catch(() => null);
  if (!files) throw new Error(`Template "${args.templateId}" not found`);

  const templateSrc = await fs.readFile(path.join(dirs, "template.hbs"), "utf-8");
  const tpl = Handlebars.compile(templateSrc);
  const photoB64 = args.photoBase64 ?? null;
  const initials = args.fullName
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const expCount = args.content.experience.length;
  const initialScale = expCount <= 3 ? 1 : expCount <= 5 ? 0.86 : 0.76;
  const lang = args.language ?? "en";
  const levelLabels = (LEVEL_LABELS as Record<string, { high: string; medium: string }>)[lang] ?? LEVEL_LABELS.en;
  const uiLabels = (UI_LABELS as Record<string, { languages: string; skills: string; experience: string; contact: string; summary: string }>)[lang] ?? UI_LABELS.en;

  const watermark = args.isPro 
    ? { foreground: "", background: "" } 
    : centeredWatermarkHtml("ABCV — FREE VERSION");

  const buildHtml = (fontScale: number) => {
    const html = tpl({
      accentColor: args.accentColor,
      fontId: args.fontId,
      fontScale,
      fullName: args.fullName,
      email: args.email,
      phone: args.phone,
      photoB64,
      initials,
      roleTitle: args.roleTitle,
      content: args.content,
      levelLabels,
      uiLabels,
    });
    
    // Inject background and foreground watermarks in page wrapper to create the secure red lock sandwich
    if (html.includes('<div class="page">')) {
      return html.replace(
        '<div class="page">', 
        `<div class="page" style="position: relative;">${watermark.background}${watermark.foreground}`
      );
    }
    return html.replace("</body>", `${watermark.foreground}</body>`);
  };

  const margins = extractPageMarginsMm(templateSrc);
  const verticalMarginMm = margins.top + margins.bottom;

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: CHROMIUM_ARGS,
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 900, height: 1400 });

    const MIN_SCALE = 0.55;
    const MAX_ATTEMPTS = 4;
    let scale = initialScale;
    let finalHtml = buildHtml(scale);

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      await page.setContent(finalHtml, { waitUntil: "networkidle0" });
      const { contentPx, targetPx } = (await page.evaluate(`(() => {
        const marginMm = ${verticalMarginMm};
        const mmToPx = (mm) => {
          const probe = document.createElement("div");
          probe.style.cssText = 'position:absolute; visibility:hidden; height:' + mm + 'mm;';
          document.body.appendChild(probe);
          const px = probe.getBoundingClientRect().height;
          probe.remove();
          return px;
        };
        const pageEl = document.querySelector(".page");
        const contentPx = (pageEl ?? document.documentElement).scrollHeight;
        const targetPx = mmToPx(297 - marginMm);
        return { contentPx, targetPx };
      })()`)) as { contentPx: number; targetPx: number };

      if (contentPx <= targetPx + 2 || scale <= MIN_SCALE) break;
      const ratio = targetPx / contentPx;
      const next = Math.max(MIN_SCALE, Math.round(scale * ratio * 0.97 * 1000) / 1000);
      if (next >= scale) break; // no further improvement possible
      scale = next;
      finalHtml = buildHtml(scale);
    }

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: `${margins.top}mm`,
        right: `${margins.right}mm`,
        bottom: `${margins.bottom}mm`,
        left: `${margins.left}mm`,
      },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

/** Cover letter render */
export interface CoverLetterArgs {
  fullName: string;
  email: string;
  phone: string;
  roleTitle?: string | null;
  body: string;
  isPro?: boolean;
}

export async function renderCoverLetterPdf(args: CoverLetterArgs): Promise<Buffer> {
  const initials = args.fullName
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const closingHtml = `
  <div class="closing">
    <p>Sincerely,</p>
    <p><strong>${args.fullName}</strong></p>
  </div>`;

  const watermarkHtml = args.isPro ? '' : `
  <div style="position: fixed; bottom: 15px; right: 20px; font-family: sans-serif; font-size: 10px; color: #9ca3af; z-index: 9999;">
    Created with ABCV - The AI CV Generator (abcv.com)
  </div>`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  @page { margin: 22mm 25mm; size: A4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, "Times New Roman", serif; color: #1f2937; font-size: 11pt; line-height: 1.6; position: relative; }
  .header { margin-bottom: 28px; }
  .header h1 { font-size: 18pt; font-weight: 700; color: #111827; }
  .contact { font-size: 10pt; color: #6b7280; margin-top: 2px; }
  .date { margin-bottom: 20px; color: #6b7280; font-size: 10pt; }
  .salutation { margin-bottom: 14px; }
  .body p { margin-bottom: 12px; }
  .closing { margin-top: 22px; }
</style>
</head>
<body>
  <div class="header">
    <h1>${args.fullName}</h1>
    <div class="contact">${args.email} &middot; ${args.phone}</div>
  </div>
  <div class="date">${dateStr}</div>
  <div class="salutation">Dear Hiring Manager,</div>
  <div class="body">
    ${args.body.split("\n\n").map((p) => `<p>${p.trim()}</p>`).join("\n    ")}
  </div>
  ${closingHtml}
  ${watermarkHtml}
</body>
</html>`;

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: CHROMIUM_ARGS,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "22mm", right: "25mm", bottom: "22mm", left: "25mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

// Re-export for routes
export { CVContentSchema };

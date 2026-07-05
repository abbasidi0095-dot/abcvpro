import type { LanguageEntry } from "@/lib/schemas";

type LangCode = "en" | "fr" | "es" | "de" | "da";

// Display names localized per CV output language.
const NAMES: Record<LangCode, Record<LangCode, string>> = {
  en: { en: "English", fr: "Anglais", es: "Inglés", de: "Englisch", da: "Engelsk" },
  fr: { en: "French", fr: "Français", es: "Francés", de: "Französisch", da: "Fransk" },
  es: { en: "Spanish", fr: "Espagnol", es: "Español", de: "Spanisch", da: "Spansk" },
  de: { en: "German", fr: "Allemand", es: "Alemán", de: "Deutsch", da: "Tysk" },
  da: { en: "Danish", fr: "Danois", es: "Danés", de: "Dänisch", da: "Dansk" },
};

/** Localized proficiency labels for CV templates. */
export const LEVEL_LABELS: Record<LangCode, { high: string; medium: string }> = {
  en: { high: "High", medium: "Medium" },
  fr: { high: "Haut", medium: "Moyen" },
  es: { high: "Alto", medium: "Medio" },
  de: { high: "Hoch", medium: "Mittel" },
  da: { high: "Højt", medium: "Middel" },
};

/** Localized section titles for CV templates. */
export const UI_LABELS: Record<LangCode, { languages: string; skills: string; experience: string; contact: string; summary: string }> = {
  en: { languages: "Languages", skills: "Skills", experience: "Experience", contact: "Contact", summary: "Summary" },
  fr: { languages: "Langues", skills: "Compétences", experience: "Expérience", contact: "Contact", summary: "Profil" },
  es: { languages: "Idiomas", skills: "Habilidades", experience: "Experiencia", contact: "Contacto", summary: "Perfil" },
  de: { languages: "Sprachen", skills: "Fähigkeiten", experience: "Erfahrung", contact: "Kontakt", summary: "Profil" },
  da: { languages: "Sprog", skills: "Færdigheder", experience: "Erfaring", contact: "Kontakt", summary: "Profil" },
};

/**
 * Human-readable (English) name for a CV language code. Used to make LLM
 * prompts unambiguous regardless of which ISO code is stored (e.g. "da"
 * reliably reads as "Danish (da)" instead of just "da").
 */
export function languageDisplayName(code: string): string {
  return (NAMES as Record<string, Record<string, string>>)[code]?.en ?? code;
}

const BASE_CODES: LangCode[] = ["en", "fr", "es"];

/**
 * Deterministic languages list — EN/FR/ES always present; plus the CV's own
 * output language when it isn't already one of those three (e.g. DE, DA).
 * The CV's output language is marked "high", the others "medium".
 */
export function buildLanguages(cvLang: string): LanguageEntry[] {
  const safeLang = (NAMES as Record<string, Record<string, string>>)[cvLang] ? (cvLang as LangCode) : "en";
  const codes = BASE_CODES.includes(safeLang) ? [...BASE_CODES] : [...BASE_CODES, safeLang];
  return codes.map((code) => ({
    name: NAMES[code][safeLang] ?? NAMES[code].en,
    level: code === safeLang ? "high" : "medium",
  }));
}

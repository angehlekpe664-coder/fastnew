import { getSupabaseAdmin, isSupabaseConfigured } from "../lib/supabase.js";
import { createCache } from "../lib/cache.js";
import { parseReceiptFile, parseReceiptBuffer, verifyTreasuryQr } from "./receipt-parser.service.js";
import type { ParsedReceipt } from "./receipt-parser.service.js";

export type ValidationRules = {
  expectedAmount: number;
  academicYear: string;
  treasuryAccountNumber: string;
  paymentTitle: string;
  allowedDateFrom: string | null;
  allowedDateTo: string | null;
  treasuryDomain: string;
  requireQrCode: boolean;
  requireOfficialLogo: boolean;
  requireTpCodeMatch: boolean;
  requireYearMatch: boolean;
  customRules: Array<{ key: string; value: string; enabled: boolean }>;
};

export const DEFAULT_RULES: ValidationRules = {
  expectedAmount: 1000,
  academicYear: "2025-2026",
  treasuryAccountNumber: "",
  paymentTitle: "FAST/PRODUITS ACCESSOIRES",
  allowedDateFrom: null,
  allowedDateTo: null,
  treasuryDomain: "equittancetresor.finances.bj",
  requireQrCode: true,
  requireOfficialLogo: true,
  requireTpCodeMatch: true,
  requireYearMatch: true,
  customRules: [],
};

const rulesCache = createCache<ValidationRules>(30_000);

export function invalidateRulesCache() {
  rulesCache.clear();
}

export async function getValidationRules(): Promise<ValidationRules> {
  const cached = rulesCache.get();
  if (cached) return cached;

  if (!isSupabaseConfigured()) return DEFAULT_RULES;

  const { data } = await getSupabaseAdmin().from("validation_settings").select("key, value");
  if (!data?.length) return DEFAULT_RULES;

  const merged = { ...DEFAULT_RULES } as Record<string, unknown>;
  for (const row of data) {
    let val = row.value;
    if (typeof val === "string") {
      try {
        val = JSON.parse(val);
      } catch {
        /* keep string */
      }
    }
    merged[row.key] = val;
  }
  const rules = merged as unknown as ValidationRules;
  rulesCache.set(rules);
  return rules;
}

export async function upsertValidationRules(rules: Partial<ValidationRules>) {
  const sb = getSupabaseAdmin();
  for (const [key, value] of Object.entries(rules)) {
    await sb.from("validation_settings").upsert(
      { key, value, label: key, category: "validation", updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  }
  invalidateRulesCache();
  return getValidationRules();
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Prénom et nom doivent tous deux apparaître sur la quittance. */
export function prenomNomMatch(prenom: string, nom: string, receiptName: string): boolean {
  if (!receiptName.trim()) return false;

  const receipt = normalizeName(receiptName);
  const prenomParts = normalizeName(prenom)
    .split(/\s+/)
    .filter((p) => p.length >= 3);
  const nomParts = normalizeName(nom)
    .split(/\s+/)
    .filter((p) => p.length >= 2);

  if (!prenomParts.length || !nomParts.length) return false;

  return prenomParts.every((p) => receipt.includes(p)) && nomParts.every((n) => receipt.includes(n));
}

export function yearInAcademicYear(year: number, academicYear: string): boolean {
  const range = academicYear.match(/(\d{4})\s*[-–]\s*(\d{4})/);
  if (range) {
    return year >= parseInt(range[1], 10) && year <= parseInt(range[2], 10);
  }
  const single = parseInt(academicYear, 10);
  return !Number.isNaN(single) ? year === single : true;
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const fr = value.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (fr) {
    const year = fr[3].length === 2 ? `20${fr[3]}` : fr[3];
    return new Date(`${year}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}`);
  }
  return null;
}

export type VerificationInput = {
  nom: string;
  prenom: string;
  matricule: string;
  filiere: string;
  codeTp: string;
  tpTitle: string;
  expectedAmount: number;
  filePath?: string;
  fileBuffer?: Buffer;
  mimeType: string;
};

export type VerificationResult =
  | { success: true; validationId: string; extracted: ParsedReceipt; confidence: number }
  | { success: false; motif: string; extracted?: ParsedReceipt };

export async function verifyReceipt(
  input: VerificationInput,
  rules: ValidationRules
): Promise<VerificationResult> {
  let extracted: ParsedReceipt;

  try {
    extracted = input.fileBuffer
      ? await parseReceiptBuffer(input.fileBuffer, input.mimeType)
      : await parseReceiptFile(input.filePath!, input.mimeType);
  } catch (error) {
    return {
      success: false,
      motif: error instanceof Error ? error.message : "Impossible de lire le document.",
    };
  }

  const expectedAmount = input.expectedAmount || rules.expectedAmount;
  const isTreasuryDoc =
    extracted.hasOfficialLogo ||
    extracted.quittanceNumber ||
    extracted.qrUrl ||
    /partie\s+versante/i.test(extracted.rawText);

  if (!isTreasuryDoc && extracted.confidence < 0.55) {
    return {
      success: false,
      motif: "Document illisible ou format non reconnu. Utilisez une quittance officielle du Trésor (PDF ou photo nette).",
      extracted,
    };
  }

  if (!extracted.studentName) {
    return {
      success: false,
      motif: "Impossible de lire le nom sur la quittance (Partie versante).",
      extracted,
    };
  }

  if (!prenomNomMatch(input.prenom, input.nom, extracted.studentName)) {
    return {
      success: false,
      motif: `Identité non concordante. Sur la quittance : « ${extracted.studentName} » — attendu : ${input.prenom} ${input.nom}.`,
      extracted,
    };
  }

  if (rules.requireTpCodeMatch) {
    const tpOnReceipt = extracted.tpCodeFromReceipt || input.codeTp;
    if (!extracted.tpCodeFromReceipt) {
      return {
        success: false,
        motif: "Code TP introuvable sur la quittance (attendu entre parenthèses à côté du nom).",
        extracted,
      };
    }
    if (extracted.tpCodeFromReceipt.toUpperCase() !== input.codeTp.toUpperCase()) {
      return {
        success: false,
        motif: `Code TP sur la quittance (${extracted.tpCodeFromReceipt}) ≠ code saisi (${input.codeTp}).`,
        extracted,
      };
    }
  }

  if (rules.requireYearMatch) {
    if (!extracted.paymentYear) {
      return {
        success: false,
        motif: "Date / année de la quittance illisible.",
        extracted,
      };
    }
    if (!yearInAcademicYear(extracted.paymentYear, rules.academicYear)) {
      return {
        success: false,
        motif: `Année ${extracted.paymentYear} hors période académique ${rules.academicYear}.`,
        extracted,
      };
    }
  }

  if (expectedAmount > 0) {
    if (!extracted.amount) {
      return {
        success: false,
        motif: "Montant illisible sur la quittance.",
        extracted,
      };
    }
    if (extracted.amount !== expectedAmount) {
      return {
        success: false,
        motif: `Montant incorrect : ${extracted.amount} FCFA (attendu ${expectedAmount} FCFA pour ${input.codeTp}).`,
        extracted,
      };
    }
  }

  if (rules.requireOfficialLogo && !extracted.hasOfficialLogo) {
    return {
      success: false,
      motif: "Mentions officielles du Trésor Public non détectées.",
      extracted,
    };
  }

  if (rules.requireQrCode && !extracted.qrUrl) {
    return { success: false, motif: "QR Code officiel du Trésor introuvable.", extracted };
  }

  if (extracted.qrUrl) {
    if (!extracted.qrUrl.includes(rules.treasuryDomain)) {
      return {
        success: false,
        motif: "QR Code non officiel (domaine Trésor invalide).",
        extracted,
      };
    }

    const qrCheck = await verifyTreasuryQr(extracted.qrUrl, extracted);
    extracted.qrVerifiedOnline = qrCheck.verifiedOnline;
    if (!qrCheck.ok) {
      return { success: false, motif: qrCheck.motif ?? "Échec vérification QR Trésor.", extracted };
    }
  }

  const paymentDate = parseDate(extracted.datePaiement);
  if (rules.allowedDateFrom && paymentDate && paymentDate < new Date(rules.allowedDateFrom)) {
    return { success: false, motif: "Date de paiement antérieure à la période autorisée.", extracted };
  }
  if (rules.allowedDateTo && paymentDate && paymentDate > new Date(rules.allowedDateTo)) {
    return { success: false, motif: "Date de paiement postérieure à la période autorisée.", extracted };
  }

  for (const rule of rules.customRules.filter((r) => r.enabled)) {
    const haystack = `${extracted.rawText} ${extracted.paymentTitle}`.toLowerCase();
    if (!haystack.includes(rule.value.toLowerCase())) {
      return { success: false, motif: `Règle non respectée : ${rule.key}.`, extracted };
    }
  }

  const validationId = `UV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  return {
    success: true,
    validationId,
    extracted: { ...extracted, amount: extracted.amount || expectedAmount },
    confidence: extracted.confidence,
  };
}

export async function uploadQuittance(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  if (!isSupabaseConfigured()) return filename;

  const path = `${Date.now()}-${filename}`;
  const { error } = await getSupabaseAdmin().storage
    .from("quittances")
    .upload(path, buffer, { contentType: mimeType, upsert: false });

  if (error) throw new Error(`Upload Storage : ${error.message}`);
  return path;
}

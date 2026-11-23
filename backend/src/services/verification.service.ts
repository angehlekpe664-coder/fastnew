import { getSupabaseAdmin, isSupabaseConfigured } from "../lib/supabase.js";
import { createCache } from "../lib/cache.js";
import fs from "fs/promises";
import { parseReceiptFile, parseReceiptBuffer, verifyTreasuryQr } from "./receipt-parser.service.js";
import type { ParsedReceipt } from "./receipt-parser.service.js";
import {
  analyzeDocumentIntegrity,
  type DocumentIntegrityReport,
} from "./document-integrity.service.js";
import { logger } from "../logger.js";

export type ValidationRules = {
  expectedAmount: number;
  academicYear: string;
  treasuryAccountNumber: string;
  paymentTitle: string;
  allowedDateFrom: string | null;
  allowedDateTo: string | null;
  validFromMonth: number | null;
  validFromYear: number | null;
  rejectObsoleteReceipts: boolean;
  treasuryDomain: string;
  requireQrCode: boolean;
  requireOfficialLogo: boolean;
  requireTpCodeMatch: boolean;
  requireYearMatch: boolean;
  requireAmountConsistency: boolean;
  requireNoModificationSoftware: boolean;
  requirePkiCheck: boolean;
  requireVectorStructure: boolean;
  customRules: Array<{ key: string; value: string; enabled: boolean }>;
};

export const DEFAULT_RULES: ValidationRules = {
  expectedAmount: 1000,
  academicYear: "2025-2026",
  treasuryAccountNumber: "",
  paymentTitle: "FAST/PRODUITS ACCESSOIRES",
  allowedDateFrom: null,
  allowedDateTo: null,
  validFromMonth: 9,
  validFromYear: 2025,
  rejectObsoleteReceipts: true,
  treasuryDomain: "equittancetresor.finances.bj",
  requireQrCode: false,
  requireOfficialLogo: true,
  requireTpCodeMatch: true,
  requireYearMatch: true,
  requireAmountConsistency: true,
  requireNoModificationSoftware: true,
  requirePkiCheck: false,
  requireVectorStructure: true,
  customRules: [],
};

const rulesCache = createCache<ValidationRules>(120_000);

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

function prenomNomMatch(inputPrenom: string, inputNom: string, receiptName: string): boolean {
  const cleanReceipt = normalizeName(receiptName);
  const cleanNom = normalizeName(inputNom);
  const cleanPrenom = normalizeName(inputPrenom);

  if (cleanNom.length >= 2 && cleanReceipt.includes(cleanNom)) return true;

  const prenomTokens = cleanPrenom.split(/\s+/).filter((t) => t.length >= 2);
  const matchPrenom = prenomTokens.some((t) => cleanReceipt.includes(t));
  return matchPrenom;
}

function yearInAcademicYear(year: number, academicYear: string): boolean {
  const range = academicYear.match(/^(\d{4})[-/](\d{4})$/);
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

function applyIntegrityChecks(
  extracted: ParsedReceipt,
  codeTp: string,
  mimeType: string,
  rules: ValidationRules
): { ok: true; integrity: DocumentIntegrityReport } | { ok: false; motif: string; integrity: DocumentIntegrityReport } {
  const integrity = analyzeDocumentIntegrity(extracted.rawText, {
    expectedTp: codeTp,
    mimeType,
    checkAmountConsistency: rules.requireAmountConsistency,
    checkTpConsistency: rules.requireTpCodeMatch,
    checkNoModificationSoftware: rules.requireNoModificationSoftware !== false,
    checkPkiSignature: rules.requirePkiCheck === true,
    checkVectorStructure: rules.requireVectorStructure !== false,
    metadataInfo: extracted.metadataInfo,
    securityAnalysis: extracted.securityAnalysis,
  });

  extracted.integrity = integrity;

  if (integrity.resolvedAmount > 0) {
    extracted.amount = integrity.resolvedAmount;
  }

  if (!integrity.passed && integrity.blockingMotif) {
    return { ok: false, motif: integrity.blockingMotif, integrity };
  }

  return { ok: true, integrity };
}

export async function verifyReceipt(
  input: VerificationInput,
  rules: ValidationRules
): Promise<VerificationResult> {
  let extracted: ParsedReceipt;

  const fileBuffer =
    input.fileBuffer ?? (input.filePath ? await fs.readFile(input.filePath) : null);
  if (!fileBuffer) {
    return { success: false, motif: "Fichier quittance manquant." };
  }

  try {
    extracted = await parseReceiptBuffer(fileBuffer, input.mimeType);
  } catch (error) {
    return {
      success: false,
      motif: error instanceof Error ? error.message : "Impossible de lire le document PDF.",
    };
  }

  const integrityResult = applyIntegrityChecks(extracted, input.codeTp, input.mimeType, rules);
  if (!integrityResult.ok) {
    return {
      success: false,
      motif: integrityResult.motif,
      extracted,
    };
  }

  const expectedAmount = input.expectedAmount || rules.expectedAmount;
  const isTreasuryDoc =
    extracted.hasOfficialLogo ||
    extracted.quittanceNumber ||
    extracted.qrUrl ||
    /partie\s+versante|tr[ée]sor/i.test(extracted.rawText);

  if (!isTreasuryDoc && extracted.confidence < 0.45) {
    return {
      success: false,
      motif: "Document illisible ou format non reconnu. Veuillez fournir une quittance PDF officielle du Trésor Public.",
      extracted,
    };
  }

  if (!extracted.studentName) {
    return {
      success: false,
      motif: "Impossible de lire le nom sur la quittance (ligne 'Partie versante').",
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

  // --- NOUVELLE FONCTIONNALITÉ : Contrôle de début de validité (Anti-Obsolescence) ---
  if (rules.rejectObsoleteReceipts !== false) {
    const minMonth = rules.validFromMonth ?? 9;
    const minYear = rules.validFromYear ?? 2025;

    if (extracted.datePaiement) {
      const paymentDate = parseDate(extracted.datePaiement);
      if (paymentDate) {
        const pMonth = paymentDate.getMonth() + 1;
        const pYear = paymentDate.getFullYear();

        const pTotal = pYear * 12 + pMonth;
        const minTotal = minYear * 12 + minMonth;

        if (pTotal < minTotal) {
          const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
          const monthName = months[minMonth - 1] || `${minMonth}`;
          logger.warn(`Quittance obsolète payée le ${extracted.datePaiement} (Seuil exigé: ${monthName} ${minYear})`);
          return {
            success: false,
            motif: `Quittance obsolète : la quittance a été payée le ${extracted.datePaiement}, ce qui est antérieur au mois de début de validité exigé (${monthName} ${minYear}). Veuillez fournir une quittance récente.`,
            extracted,
          };
        }
      }
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
      motif: "Mentions officielles du Trésor Public non détectées dans le PDF.",
      extracted,
    };
  }

  if (rules.requireQrCode) {
    if (!extracted.qrUrl) {
      return {
        success: false,
        motif: "QR Code du Trésor Public introuvable.",
        extracted,
      };
    }

    const domain = rules.treasuryDomain || "equittancetresor.finances.bj";
    if (!verifyTreasuryQr(extracted.qrUrl, domain)) {
      return {
        success: false,
        motif: `QR Code non conforme : doit provenir de ${domain}.`,
        extracted,
      };
    }
  }

  const confidence = Math.min(1.0, extracted.confidence + (extracted.qrUrl ? 0.15 : 0.05));
  const validationId = `UV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  return {
    success: true,
    validationId,
    extracted,
    confidence,
  };
}

export async function uploadQuittance(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `quittances/${Date.now()}_${safeName}`;

  if (!isSupabaseConfigured()) {
    return storagePath;
  }

  const { error } = await getSupabaseAdmin()
    .storage.from("quittances")
    .upload(storagePath, buffer, { contentType: mimeType, upsert: true });

  if (error) {
    logger.warn(`Échec upload Supabase Storage (${error.message}), enregistrement avec chemin local.`);
  }

  return storagePath;
}

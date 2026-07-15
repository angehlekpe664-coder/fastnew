import { GoogleGenerativeAI } from "@google/generative-ai";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import pdfParse from "pdf-parse";
import fs from "fs/promises";
import type { ValidationRules } from "./settings.js";

export type ExtractedReceipt = {
  quittanceNumber: string;
  referencePaiement: string;
  amount: number;
  studentName: string;
  datePaiement: string;
  paymentTitle: string;
  bankOrChannel: string;
  establishment: string;
  hasOfficialLogo: boolean;
  qrUrl: string | null;
  confidence: number;
  rawText: string;
};

function cleanJson(text: string): string {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function namesMatch(formName: string, receiptName: string): boolean {
  const form = normalizeName(formName);
  const receipt = normalizeName(receiptName);
  const parts = form.split(/\s+/).filter((p) => p.length > 2);
  return parts.some((part) => receipt.includes(part));
}

function parseAmount(value: unknown): number {
  if (typeof value === "number") return value;
  const str = String(value ?? "0");
  const digits = str.replace(/[^0-9]/g, "");
  return parseInt(digits, 10) || 0;
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const fr = value.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (fr) {
    const year = fr[3].length === 2 ? `20${fr[3]}` : fr[3];
    return new Date(`${year}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}`);
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function decodeQrFromImage(buffer: Buffer): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      new PNG({ filterType: 4 }).parse(buffer, (error, data) => {
        if (error) {
          resolve(null);
          return;
        }
        const code = jsQR(new Uint8ClampedArray(data.data), data.width, data.height);
        resolve(code?.data ?? null);
      });
    } catch {
      resolve(null);
    }
  });
}

function extractQrUrlFromPdfText(content: string): string | null {
  const regex = /(https:\/\/equittancetresor\.finances\.bj:9051\/paiement-efc\/\?[^\s"'>)]+)/g;
  const matches = content.match(regex);
  if (!matches?.length) return null;
  return matches[0].split(/[\\)"]/)[0];
}

async function extractQrUrl(filePath: string, mimeType: string): Promise<string | null> {
  const buffer = await fs.readFile(filePath);
  if (mimeType === "application/pdf" || filePath.endsWith(".pdf")) {
    const parsed = await pdfParse(buffer);
    return extractQrUrlFromPdfText(parsed.text);
  }
  return decodeQrFromImage(buffer);
}

async function analyzeWithGemini(filePath: string, mimeType: string): Promise<ExtractedReceipt> {
  const apiKey = process.env.GEMINI_API_KEY;
  const buffer = await fs.readFile(filePath);
  const base64 = buffer.toString("base64");

  if (!apiKey) {
    return simulateExtraction(filePath);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Analyse cette quittance de paiement universitaire du Trésor Public du Bénin.
Extrais UNIQUEMENT un JSON avec cette structure exacte:
{
  "quittanceNumber": "numéro de quittance",
  "referencePaiement": "référence transaction Mobile Money/banque",
  "amount": 2500,
  "studentName": "nom complet sur la quittance",
  "datePaiement": "JJ/MM/AAAA",
  "paymentTitle": "intitulé du paiement",
  "bankOrChannel": "banque ou canal",
  "establishment": "établissement",
  "hasOfficialLogo": true,
  "confidence": 0.95
}`;

  const result = await model.generateContent([
    { inlineData: { data: base64, mimeType } },
    prompt,
  ]);

  const text = cleanJson(result.response.text());
  const parsed = JSON.parse(text);
  const qrUrl = await extractQrUrl(filePath, mimeType);

  return {
    quittanceNumber: parsed.quittanceNumber ?? "",
    referencePaiement: parsed.referencePaiement ?? parsed.transactionId ?? "",
    amount: parseAmount(parsed.amount),
    studentName: parsed.studentName ?? "",
    datePaiement: parsed.datePaiement ?? parsed.date ?? "",
    paymentTitle: parsed.paymentTitle ?? "",
    bankOrChannel: parsed.bankOrChannel ?? "",
    establishment: parsed.establishment ?? "",
    hasOfficialLogo: Boolean(parsed.hasOfficialLogo),
    qrUrl,
    confidence: Number(parsed.confidence ?? 0.9),
    rawText: text,
  };
}

async function simulateExtraction(filePath: string): Promise<ExtractedReceipt> {
  const name = filePath.toLowerCase();
  if (name.includes("fail") || name.includes("invalid") || name.includes("erreur")) {
    throw new Error("Document illisible ou format non reconnu.");
  }

  const qrUrl = await extractQrUrl(filePath, "image/png");
  const id = `Q-${Date.now().toString().slice(-8)}`;

  return {
    quittanceNumber: `2601516152-001D/CE-${id}`,
    referencePaiement: `BJ6600100100000${id}`,
    amount: 2500,
    studentName: "ETUDIANT DEMO",
    datePaiement: new Date().toLocaleDateString("fr-FR"),
    paymentTitle: "FAST/PRODUITS ACCESSOIRES",
    bankOrChannel: "MTN Mobile Money",
    establishment: "Université d'Abomey-Calavi",
    hasOfficialLogo: true,
    qrUrl,
    confidence: 0.92,
    rawText: "simulation",
  };
}

export type VerificationInput = {
  nom: string;
  prenom: string;
  faculte: string;
  departement: string;
  filiere: string;
  niveau: string;
  matiere?: string;
  filePath: string;
  mimeType: string;
};

export type VerificationResult =
  | {
      success: true;
      validationId: string;
      extracted: ExtractedReceipt;
      confidence: number;
    }
  | {
      success: false;
      motif: string;
      extracted?: ExtractedReceipt;
    };

export async function verifyReceipt(
  input: VerificationInput,
  rules: ValidationRules
): Promise<VerificationResult> {
  let extracted: ExtractedReceipt;

  try {
    extracted = await analyzeWithGemini(input.filePath, input.mimeType);
  } catch (error) {
    return {
      success: false,
      motif: error instanceof Error ? error.message : "Erreur d'analyse du document.",
    };
  }

  const fullName = `${input.prenom} ${input.nom}`.trim();

  if (!extracted.quittanceNumber) {
    return { success: false, motif: "Numéro de quittance introuvable.", extracted };
  }

  if (!namesMatch(fullName, extracted.studentName)) {
    return {
      success: false,
      motif: `Le nom sur la quittance (${extracted.studentName}) ne correspond pas à ${fullName}.`,
      extracted,
    };
  }

  if (rules.expectedAmount > 0 && extracted.amount !== rules.expectedAmount) {
    return {
      success: false,
      motif: `Montant incorrect : ${extracted.amount} FCFA attendu ${rules.expectedAmount} FCFA.`,
      extracted,
    };
  }

  if (rules.paymentTitle && extracted.paymentTitle) {
    const titleOk = extracted.paymentTitle
      .toLowerCase()
      .includes(rules.paymentTitle.toLowerCase().slice(0, 8));
    if (!titleOk) {
      return {
        success: false,
        motif: `Intitulé de paiement non conforme : « ${extracted.paymentTitle} ».`,
        extracted,
      };
    }
  }

  if (rules.requireQrCode && !extracted.qrUrl) {
    return { success: false, motif: "QR Code officiel du Trésor introuvable.", extracted };
  }

  if (extracted.qrUrl && !extracted.qrUrl.includes(rules.treasuryDomain)) {
    return {
      success: false,
      motif: "Le QR Code ne pointe pas vers le domaine officiel du Trésor Public.",
      extracted,
    };
  }

  if (rules.requireOfficialLogo && !extracted.hasOfficialLogo) {
    return { success: false, motif: "Logo officiel non détecté sur le document.", extracted };
  }

  const paymentDate = parseDate(extracted.datePaiement);
  if (rules.allowedDateFrom && paymentDate) {
    const from = new Date(rules.allowedDateFrom);
    if (paymentDate < from) {
      return { success: false, motif: "Date de paiement antérieure à la période autorisée.", extracted };
    }
  }
  if (rules.allowedDateTo && paymentDate) {
    const to = new Date(rules.allowedDateTo);
    if (paymentDate > to) {
      return { success: false, motif: "Date de paiement postérieure à la période autorisée.", extracted };
    }
  }

  for (const rule of rules.customRules.filter((r) => r.enabled)) {
    const haystack = `${extracted.rawText} ${extracted.paymentTitle} ${extracted.establishment}`.toLowerCase();
    if (!haystack.includes(rule.value.toLowerCase())) {
      return {
        success: false,
        motif: `Règle personnalisée non respectée : ${rule.key}.`,
        extracted,
      };
    }
  }

  const validationId = `UV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  return {
    success: true,
    validationId,
    extracted,
    confidence: extracted.confidence,
  };
}

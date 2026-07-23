import fs from "fs/promises";
import pdfParse from "pdf-parse";
import { PNG } from "pngjs";
import jpeg from "jpeg-js";
import jsQR from "jsqr";
import { ocrImage } from "./ocr.worker.js";

export type ParsedReceipt = {
  quittanceNumber: string;
  referencePaiement: string;
  amount: number;
  studentName: string;
  tpCodeFromReceipt: string;
  paymentYear: number | null;
  datePaiement: string;
  paymentTitle: string;
  bankOrChannel: string;
  hasOfficialLogo: boolean;
  qrUrl: string | null;
  qrVerifiedOnline: boolean;
  confidence: number;
  rawText: string;
  method: string[];
};

const TREASURY_QR =
  /https:\/\/equittancetresor\.finances\.bj:9051\/paiement-efc\/\?[^\s"'>\)\]]+/gi;
const PARTIE_VERSANTE = /partie\s+versante\s*:\s*(.+?)(?:\n|$)/i;
const TP_IN_PARENS = /\(([A-Z]{2,5}\d{4}(?:-\d+)?)\)/;
const QUITTANCE_NUM = /quittance\s*n[°o]\s*([0-9]{6,}[-\/][0-9A-Z\/]+)/i;
const DATE_LINE = /date\s*:\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i;
const REF_PATTERN = /([A-Z]{2}\d{10,})\s*[-–—]\s*FAST/i;
const AMOUNT_ARRETE = /somme\s+de\s*:[^(]*\(([0-9\s]{1,9})\)\s*FCFA/i;
const MTN_MOOV = /(MTN|MOOV|CELTIS|BMO|CORIS)/i;

type RgbaImage = { data: Uint8Array; width: number; height: number };

async function decodeImageBuffer(buffer: Buffer, mimeType: string): Promise<RgbaImage | null> {
  if (mimeType === "image/png" || buffer[0] === 0x89) {
    return new Promise((resolve) => {
      new PNG({ filterType: 4 }).parse(buffer, (error, data) => {
        if (error) return resolve(null);
        resolve({ data: new Uint8Array(data.data), width: data.width, height: data.height });
      });
    });
  }
  if (mimeType === "image/jpeg" || mimeType === "image/jpg" || buffer[0] === 0xff) {
    try {
      const raw = jpeg.decode(buffer, { useTArray: true });
      return { data: raw.data, width: raw.width, height: raw.height };
    } catch {
      return null;
    }
  }
  return null;
}

function downscaleForOcr(image: RgbaImage, maxWidth = 1100): RgbaImage {
  if (image.width <= maxWidth) return image;
  const ratio = maxWidth / image.width;
  const width = maxWidth;
  const height = Math.max(1, Math.round(image.height * ratio));
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const sy = Math.min(image.height - 1, Math.floor(y / ratio));
    for (let x = 0; x < width; x++) {
      const sx = Math.min(image.width - 1, Math.floor(x / ratio));
      const si = (sy * image.width + sx) * 4;
      const di = (y * width + x) * 4;
      data[di] = image.data[si];
      data[di + 1] = image.data[si + 1];
      data[di + 2] = image.data[si + 2];
      data[di + 3] = 255;
    }
  }
  return { data, width, height };
}

function scanQrFromImage(image: RgbaImage): string | null {
  const code = jsQR(new Uint8ClampedArray(image.data), image.width, image.height);
  return code?.data ?? null;
}

export function parseAmountFromText(text: string): number {
  const arret = text.match(AMOUNT_ARRETE);
  if (arret) {
    const n = parseInt(arret[1].replace(/[^0-9]/g, ""), 10);
    if (n >= 100 && n <= 500000) return n;
  }

  const tableAmounts = [...text.matchAll(/([0-9]{1,3}(?:\s[0-9]{3})+)\s*(?:\n|\r|$)/g)];
  for (const m of tableAmounts) {
    const n = parseInt(m[1].replace(/\s/g, ""), 10);
    if (n >= 100 && n <= 500000) return n;
  }

  const fcfa = [...text.matchAll(/([0-9]{1,3}(?:[.\s][0-9]{3})+|[0-9]{3,6})\s*(?:FCFA|F\.?C\.?F\.?A)/gi)];
  for (const m of fcfa) {
    const n = parseInt(m[1].replace(/[^0-9]/g, ""), 10);
    if (n >= 100 && n <= 500000) return n;
  }
  return 0;
}

export function parseTreasuryFields(text: string) {
  const partie = text.match(PARTIE_VERSANTE);
  const payerLine = partie?.[1]?.trim() ?? "";

  let studentName = payerLine;
  let tpCodeFromReceipt = "";
  if (payerLine) {
    const tpMatch = payerLine.match(TP_IN_PARENS);
    tpCodeFromReceipt = tpMatch?.[1]?.toUpperCase() ?? "";
    studentName = payerLine.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  }

  if (!studentName) {
    for (const line of text.split(/\n/)) {
      if (/partie\s+versante/i.test(line)) {
        studentName = line.replace(/.*partie\s+versante\s*:\s*/i, "").replace(/\([^)]*\)/g, " ").trim();
        const tpMatch = line.match(TP_IN_PARENS);
        tpCodeFromReceipt = tpMatch?.[1]?.toUpperCase() ?? tpCodeFromReceipt;
        break;
      }
    }
  }

  const quittanceMatch = text.match(QUITTANCE_NUM);
  const quittanceNumber =
    quittanceMatch?.[1] ?? text.match(/[0-9]{8,}[-\/][0-9A-Z\/]+/i)?.[0] ?? "";

  const dateMatch = text.match(DATE_LINE) ?? text.match(/(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/);
  const datePaiement = dateMatch?.[1] ?? "";

  let paymentYear: number | null = null;
  const yearMatch = datePaiement.match(/(\d{2,4})$/);
  if (yearMatch) {
    const y = yearMatch[1];
    paymentYear = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
  }

  const refMatch = text.match(REF_PATTERN) ?? text.match(/(?:r[ée]f[ée]rence|transaction)[:\s]*([A-Z0-9]{10,})/i);
  const channelMatch = text.match(MTN_MOOV);
  const amount = parseAmountFromText(text);

  const qrInText = text.match(TREASURY_QR)?.[0] ?? null;
  const hasTreasury =
    /tr[ée]sor|finances\.bj|dgtcp|minist[èe]re.*finances|r[ée]publique du b[ée]nin/i.test(text) ||
    Boolean(qrInText);

  return {
    quittanceNumber,
    referencePaiement: refMatch?.[1] ?? "",
    amount,
    studentName,
    tpCodeFromReceipt,
    paymentYear,
    datePaiement,
    paymentTitle: text.match(/FAST\/PRODUITS ACCESSOIRES/i)?.[0] ?? "FAST/PRODUITS ACCESSOIRES",
    bankOrChannel: channelMatch?.[1] ?? "",
    hasOfficialLogo: hasTreasury,
    qrUrl: qrInText,
  };
}

async function parseBuffer(buffer: Buffer, mimeType: string): Promise<ParsedReceipt> {
  const methods: string[] = [];
  let rawText = "";
  let qrUrl: string | null = null;

  if (mimeType === "application/pdf") {
    const parsed = await pdfParse(buffer);
    rawText = parsed.text;
    methods.push("pdf-parse");
    qrUrl = rawText.match(TREASURY_QR)?.[0] ?? null;
  } else if (mimeType.startsWith("image/")) {
    const image = await decodeImageBuffer(buffer, mimeType);
    const ocrSource = image ? downscaleForOcr(image) : null;

    const [qrResult, ocrText] = await Promise.all([
      image ? Promise.resolve(scanQrFromImage(image)) : Promise.resolve(null),
      ocrSource
        ? ocrImage({ data: ocrSource.data, width: ocrSource.width, height: ocrSource.height })
        : ocrImage(buffer),
    ]);

    qrUrl = qrResult;
    if (qrUrl) methods.push("jsQR");
    if (ocrText.trim()) {
      rawText = ocrText;
      methods.push("tesseract-ocr");
    } else if (qrUrl) {
      rawText = qrUrl;
    }
  }

  const fields = parseTreasuryFields(rawText);
  if (!qrUrl && fields.qrUrl) qrUrl = fields.qrUrl;
  if (qrUrl && !rawText.includes(qrUrl)) methods.push("qr-tresor");

  let confidence = 0.45;
  if (fields.quittanceNumber) confidence += 0.15;
  if (fields.studentName) confidence += 0.1;
  if (fields.tpCodeFromReceipt) confidence += 0.1;
  if (fields.amount > 0) confidence += 0.1;
  if (fields.paymentYear) confidence += 0.05;
  if (qrUrl) confidence += 0.15;
  if (fields.hasOfficialLogo) confidence += 0.05;

  return {
    ...fields,
    qrUrl,
    qrVerifiedOnline: false,
    confidence: Math.min(confidence, 0.98),
    rawText: rawText.slice(0, 8000),
    method: methods,
  };
}

export async function parseReceiptFile(filePath: string, mimeType: string): Promise<ParsedReceipt> {
  const buffer = await fs.readFile(filePath);
  return parseBuffer(buffer, mimeType);
}

export async function parseReceiptBuffer(buffer: Buffer, mimeType: string): Promise<ParsedReceipt> {
  return parseBuffer(buffer, mimeType);
}

/** Vérifie le QR Trésor — timeout court pour ne pas bloquer la réponse. */
export async function verifyTreasuryQr(
  qrUrl: string,
  extracted: Pick<ParsedReceipt, "quittanceNumber" | "amount" | "referencePaiement">
): Promise<{ ok: boolean; verifiedOnline: boolean; motif?: string }> {
  if (!qrUrl.includes("equittancetresor.finances.bj")) {
    return { ok: false, verifiedOnline: false, motif: "QR Code non officiel (domaine Trésor invalide)." };
  }
  if (!/verify=[a-f0-9]+/i.test(qrUrl)) {
    return { ok: false, verifiedOnline: false, motif: "QR Code Trésor invalide (token de vérification absent)." };
  }

  try {
    const res = await fetch(qrUrl, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return { ok: true, verifiedOnline: false };

    const html = await res.text();
    if (!html.trim()) return { ok: true, verifiedOnline: false };

    if (extracted.quittanceNumber) {
      const digits = extracted.quittanceNumber.replace(/[^0-9A-Z]/gi, "");
      if (!html.replace(/[^0-9A-Z]/gi, "").includes(digits.slice(0, 8))) {
        return {
          ok: false,
          verifiedOnline: true,
          motif: "Le QR Trésor ne confirme pas le numéro de quittance.",
        };
      }
    }

    if (extracted.amount > 0) {
      const amounts = [...html.matchAll(/([0-9]{1,3}(?:[\s.][0-9]{3})+|[0-9]{3,6})\s*(?:FCFA|F\.?C\.?F\.?A)/gi)];
      const pageAmounts = amounts.map((m) => parseInt(m[1].replace(/[^0-9]/g, ""), 10)).filter(Boolean);
      if (pageAmounts.length && !pageAmounts.includes(extracted.amount)) {
        return {
          ok: false,
          verifiedOnline: true,
          motif: `Montant sur le site Trésor (${pageAmounts[0]} FCFA) ≠ quittance (${extracted.amount} FCFA).`,
        };
      }
    }

    return { ok: true, verifiedOnline: true };
  } catch {
    return { ok: true, verifiedOnline: false };
  }
}

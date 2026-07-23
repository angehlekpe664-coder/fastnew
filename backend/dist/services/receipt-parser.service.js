import fs from "fs/promises";
import pdfParse from "pdf-parse";
import { PNG } from "pngjs";
import jsQR from "jsqr";
const TREASURY_QR = /https:\/\/equittancetresor\.finances\.bj:9051\/paiement-efc\/\?[^\s"'>\)]+/gi;
const QUITTANCE_NUM = /(?:quittance|n[°o]|num[ée]ro)[:\s]*([0-9]{6,}[-\/]?[0-9A-Z\/]*)/i;
const AMOUNT_PATTERNS = [
    /(?:montant|total|pay[ée])[:\s]*([0-9\s.,]+)\s*(?:FCFA|F\.?C\.?F\.?A|XOF)?/i,
    /([0-9]{1,3}(?:[.\s][0-9]{3})+)\s*(?:FCFA|F\.?C\.?F\.?A|XOF)/i,
];
const DATE_PATTERN = /(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/;
const REF_PATTERN = /(?:r[ée]f[ée]rence|transaction|id)[:\s]*([A-Z0-9]{10,})/i;
const MTN_MOov = /(MTN|MOOV|CELTIS|BMO|CORIS)/i;
async function decodeQrFromImage(buffer) {
    return new Promise((resolve) => {
        try {
            new PNG({ filterType: 4 }).parse(buffer, (error, data) => {
                if (error)
                    return resolve(null);
                const code = jsQR(new Uint8ClampedArray(data.data), data.width, data.height);
                resolve(code?.data ?? null);
            });
        }
        catch {
            resolve(null);
        }
    });
}
function parseAmountFromText(text) {
    for (const pat of AMOUNT_PATTERNS) {
        const m = text.match(pat);
        if (m) {
            const digits = m[1].replace(/[^0-9]/g, "");
            const n = parseInt(digits, 10);
            if (n >= 500 && n <= 500000)
                return n;
        }
    }
    const all = [...text.matchAll(/([0-9]{1,3}(?:[.\s][0-9]{3})+|[0-9]{4,5})\s*(?:FCFA|F\.?C\.?F\.?A)/gi)];
    for (const m of all) {
        const n = parseInt(m[1].replace(/[^0-9]/g, ""), 10);
        if (n >= 500 && n <= 500000)
            return n;
    }
    return 0;
}
function extractNameFromText(text) {
    const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
        if (/^(nom|payeur|b[ée]n[ée]ficiaire)/i.test(line)) {
            const parts = line.split(/[:]/);
            if (parts[1])
                return parts[1].trim();
        }
    }
    const upperLines = lines.filter((l) => l === l.toUpperCase() && l.length > 5 && /[A-Z]{3,}/.test(l));
    return upperLines[0] ?? "";
}
/**
 * Analyse 100 % gratuite — aucune API payante.
 * Méthodes : pdf-parse (texte PDF) + jsQR (QR code) + expressions régulières.
 */
export async function parseReceiptFile(filePath, mimeType) {
    const buffer = await fs.readFile(filePath);
    const methods = [];
    let rawText = "";
    let qrUrl = null;
    if (mimeType === "application/pdf" || filePath.endsWith(".pdf")) {
        const parsed = await pdfParse(buffer);
        rawText = parsed.text;
        methods.push("pdf-parse");
        const qrMatch = rawText.match(TREASURY_QR);
        if (qrMatch)
            qrUrl = qrMatch[0];
    }
    else {
        qrUrl = await decodeQrFromImage(buffer);
        methods.push("jsQR");
        rawText = qrUrl ?? "";
    }
    if (qrUrl && !rawText.includes(qrUrl))
        methods.push("qr-tresor");
    const quittanceMatch = rawText.match(QUITTANCE_NUM);
    const quittanceNumber = quittanceMatch?.[1] ??
        (rawText.match(/[0-9]{10,}[-\/][0-9A-Z\/]+/i)?.[0] ?? "");
    const amount = parseAmountFromText(rawText);
    const dateMatch = rawText.match(DATE_PATTERN);
    const refMatch = rawText.match(REF_PATTERN);
    const channelMatch = rawText.match(MTN_MOov);
    const hasTreasury = /tr[ée]sor|finances\.bj|dgtcp|uac|universit/i.test(rawText) ||
        Boolean(qrUrl?.includes("finances.bj"));
    let confidence = 0.5;
    if (quittanceNumber)
        confidence += 0.15;
    if (amount > 0)
        confidence += 0.15;
    if (qrUrl)
        confidence += 0.2;
    if (hasTreasury)
        confidence += 0.1;
    confidence = Math.min(confidence, 0.98);
    return {
        quittanceNumber,
        referencePaiement: refMatch?.[1] ?? "",
        amount,
        studentName: extractNameFromText(rawText),
        datePaiement: dateMatch?.[1] ?? "",
        paymentTitle: rawText.match(/FAST[^\n]*/i)?.[0] ?? "FAST/PRODUITS ACCESSOIRES",
        bankOrChannel: channelMatch?.[1] ?? "",
        hasOfficialLogo: hasTreasury,
        qrUrl,
        confidence,
        rawText: rawText.slice(0, 5000),
        method: methods,
    };
}

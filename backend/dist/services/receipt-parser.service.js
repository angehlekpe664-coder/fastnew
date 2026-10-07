import fs from "fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import pdfParse from "pdf-parse";
import { PNG } from "pngjs";
import jpeg from "jpeg-js";
import { ocrImage } from "./ocr.worker.js";
const require = createRequire(import.meta.url);
const jsQR = require("jsqr");
const TREASURY_QR = /https:\/\/equittancetresor\.finances\.bj:9051\/paiement-efc\/\?[^\s"'>\)\]]+/gi;
const PARTIE_VERSANTE = /partie\s+versante\s*:\s*(.+?)(?:\n|$)/i;
const TP_IN_PARENS = /\(([A-Z]{2,5}\d{4}(?:-\d+)?)\)/;
const QUITTANCE_NUM = /quittance\s*n[°o]\s*([0-9]{6,}[-\/][0-9A-Z\/]+)/i;
const DATE_LINE = /date\s*:\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i;
const REF_PATTERN = /([A-Z]{2}\d{10,})\s*[-–—]\s*FAST/i;
const AMOUNT_ARRETE = /somme\s+de\s*:[^(]*\(([0-9\s]{1,9})\)\s*FCFA/i;
const MTN_MOOV = /(MTN|MOOV|CELTIS|BMO|CORIS)/i;
async function decodeImageBuffer(buffer, mimeType) {
    if (mimeType === "image/png" || buffer[0] === 0x89) {
        return new Promise((resolve) => {
            new PNG({ filterType: 4 }).parse(buffer, (error, data) => {
                if (error)
                    return resolve(null);
                resolve({ data: new Uint8Array(data.data), width: data.width, height: data.height });
            });
        });
    }
    if (mimeType === "image/jpeg" || mimeType === "image/jpg" || buffer[0] === 0xff) {
        try {
            const raw = jpeg.decode(buffer, { useTArray: true });
            return { data: raw.data, width: raw.width, height: raw.height };
        }
        catch {
            return null;
        }
    }
    return null;
}
function downscaleForOcr(image, maxWidth = 1100) {
    if (image.width <= maxWidth)
        return image;
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
function scanQrFromImage(image) {
    const code = jsQR(new Uint8ClampedArray(image.data), image.width, image.height);
    return code?.data ?? null;
}
export function parseAmountFromText(text) {
    const arret = text.match(AMOUNT_ARRETE);
    if (arret) {
        const n = parseInt(arret[1].replace(/[^0-9]/g, ""), 10);
        if (n >= 100 && n <= 500000)
            return n;
    }
    const tableAmounts = [...text.matchAll(/([0-9]{1,3}(?:\s[0-9]{3})+)\s*(?:\n|\r|$)/g)];
    for (const m of tableAmounts) {
        const n = parseInt(m[1].replace(/\s/g, ""), 10);
        if (n >= 100 && n <= 500000)
            return n;
    }
    const fcfa = [...text.matchAll(/([0-9]{1,3}(?:[.\s][0-9]{3})+|[0-9]{3,6})\s*(?:FCFA|F\.?C\.?F\.?A)/gi)];
    for (const m of fcfa) {
        const n = parseInt(m[1].replace(/[^0-9]/g, ""), 10);
        if (n >= 100 && n <= 500000)
            return n;
    }
    return 0;
}
export function parseTreasuryFields(text) {
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
    const quittanceNumber = quittanceMatch?.[1] ?? text.match(/[0-9]{8,}[-\/][0-9A-Z\/]+/i)?.[0] ?? "";
    const dateMatch = text.match(DATE_LINE) ?? text.match(/(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/);
    const datePaiement = dateMatch?.[1] ?? "";
    let paymentYear = null;
    const yearMatch = datePaiement.match(/(\d{2,4})$/);
    if (yearMatch) {
        const y = yearMatch[1];
        paymentYear = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
    }
    const refMatch = text.match(REF_PATTERN) ?? text.match(/(?:r[ée]f[ée]rence|transaction)[:\s]*([A-Z0-9]{10,})/i);
    const channelMatch = text.match(MTN_MOOV);
    const amount = parseAmountFromText(text);
    const qrInText = text.match(TREASURY_QR)?.[0] ?? null;
    const hasTreasury = /tr[ée]sor|finances\.bj|dgtcp|minist[èe]re.*finances|r[ée]publique du b[ée]nin/i.test(text) ||
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
const EDITING_TOOLS_PATTERNS = [
    { name: "Photoshop", regex: /photoshop|adobe\s*photoshop/i },
    { name: "Illustrator", regex: /illustrator|adobe\s*illustrator/i },
    { name: "InDesign", regex: /indesign|adobe\s*indesign/i },
    { name: "Acrobat Touchup / Pro", regex: /acrobat\s*touchup|adobe\s*acrobat\s*(?:pro|edit|touchup|dc|standard)/i },
    { name: "Canva", regex: /canva/i },
    { name: "GIMP", regex: /gimp/i },
    { name: "Inkscape", regex: /inkscape/i },
    { name: "Paint.NET", regex: /paint\.net/i },
    { name: "Photopea", regex: /photopea/i },
    { name: "Pixlr", regex: /pixlr/i },
    { name: "Snapseed", regex: /snapseed/i },
    { name: "PicsArt", regex: /picsart/i },
    { name: "Affinity", regex: /affinity\s*(?:photo|publisher|designer)/i },
    { name: "CorelDRAW", regex: /coreldraw|corel\s*draw/i },
    { name: "PDF24", regex: /pdf24/i },
    { name: "Sejda", regex: /sejda/i },
    { name: "Smallpdf", regex: /smallpdf/i },
    { name: "PDFescape", regex: /pdfescape/i },
    { name: "Nitro PDF", regex: /nitro\s*(?:pdf|pro)/i },
    { name: "Foxit Editor", regex: /foxit\s*(?:editor|phantom|phantompdf)/i },
    { name: "PDFelement", regex: /pdfelement|wondershare/i },
    { name: "iLovePDF", regex: /ilovepdf/i },
    { name: "Soda PDF", regex: /sodapdf|soda\s*pdf/i },
    { name: "Master PDF Editor", regex: /master\s*pdf\s*editor/i },
    { name: "Xodo", regex: /xodo/i },
    { name: "PDF Expert", regex: /pdf\s*expert/i },
    { name: "PDF-XChange", regex: /pdf-xchange/i },
    { name: "ABBYY FineReader", regex: /abbyy|finereader/i },
    { name: "PDFedit", regex: /pdfedit|pdfmod|pdfsam|pdfill|easeus\s*pdf/i },
    { name: "Microsoft Word (Édité/Converti)", regex: /microsoft\s*word|ms\s*word/i },
    { name: "LibreOffice Draw", regex: /libreoffice\s*draw|openoffice\s*draw/i },
];
export function extractDocumentMetadata(buffer, mimeType, pdfInfo) {
    const detected = new Set();
    let producer = "";
    let creator = "";
    let modDate = "";
    let creationDate = "";
    if (mimeType === "application/pdf") {
        if (pdfInfo) {
            producer = String(pdfInfo.Producer || pdfInfo.producer || "");
            creator = String(pdfInfo.Creator || pdfInfo.creator || "");
            modDate = String(pdfInfo.ModDate || pdfInfo.modDate || "");
            creationDate = String(pdfInfo.CreationDate || pdfInfo.creationDate || "");
        }
        const headStr = buffer.toString("binary", 0, Math.min(buffer.length, 128 * 1024));
        const tailStr = buffer.length > 128 * 1024
            ? buffer.toString("binary", buffer.length - 128 * 1024)
            : "";
        const combinedStr = producer + "\n" + creator + "\n" + headStr + "\n" + tailStr;
        for (const tool of EDITING_TOOLS_PATTERNS) {
            if (tool.regex.test(combinedStr)) {
                detected.add(tool.name);
            }
        }
    }
    else if (mimeType.startsWith("image/")) {
        const headStr = buffer.toString("binary", 0, Math.min(buffer.length, 64 * 1024));
        for (const tool of EDITING_TOOLS_PATTERNS) {
            if (tool.regex.test(headStr)) {
                detected.add(tool.name);
            }
        }
    }
    const detectedTools = Array.from(detected);
    const isModified = detectedTools.length > 0;
    return {
        producer,
        creator,
        modDate,
        creationDate,
        software: detectedTools[0],
        detectedEditingTools: detectedTools,
        isModified,
        details: isModified
            ? `Outil(s) de modification détecté(s) : ${detectedTools.join(", ")}`
            : undefined,
    };
}
export function validateLuhn(digits) {
    let sum = 0;
    let alternate = false;
    for (let i = digits.length - 1; i >= 0; i--) {
        let n = parseInt(digits.charAt(i), 10);
        if (isNaN(n))
            continue;
        if (alternate) {
            n *= 2;
            if (n > 9)
                n -= 9;
        }
        sum += n;
        alternate = !alternate;
    }
    return sum % 10 === 0;
}
export function validateModulo11(digits) {
    if (digits.length < 4)
        return true;
    let sum = 0;
    let weight = 2;
    const mainPart = digits.slice(0, -1);
    const checkDigit = parseInt(digits.slice(-1), 10);
    if (isNaN(checkDigit))
        return true;
    for (let i = mainPart.length - 1; i >= 0; i--) {
        const num = parseInt(mainPart.charAt(i), 10);
        if (isNaN(num))
            continue;
        sum += num * weight;
        weight = weight === 7 ? 2 : weight + 1;
    }
    const remainder = sum % 11;
    const calculatedCheck = (11 - remainder) % 10;
    return calculatedCheck === checkDigit;
}
export function verifyQuittanceChecksum(num) {
    if (!num)
        return true;
    const clean = num.replace(/[^0-9A-Z]/gi, "");
    if (clean.length < 5)
        return true;
    const numericOnly = clean.replace(/[^0-9]/g, "");
    if (numericOnly.length < 5)
        return true;
    return validateLuhn(numericOnly) || validateModulo11(numericOnly);
}
export function analyzePdfByteRange(buffer, rawStr) {
    const hasSigDict = /\/Type\s*\/Sig|\/ByteRange\s*\[|\/adbe\.pkcs7|\/SubFilter\s*\/adbe|\/CAdES/i.test(rawStr);
    if (!hasSigDict) {
        return { hasSignature: false, isValid: true, detail: "Aucune signature numérique embarquée." };
    }
    const byteRangeMatch = rawStr.match(/\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/i);
    if (!byteRangeMatch) {
        return {
            hasSignature: true,
            isValid: false,
            detail: "Signature numérique rompue ou modifiée après émission.",
        };
    }
    const s1 = Number(byteRangeMatch[1]);
    const l1 = Number(byteRangeMatch[2]);
    const s2 = Number(byteRangeMatch[3]);
    const l2 = Number(byteRangeMatch[4]);
    const end1 = s1 + l1;
    const end2 = s2 + l2;
    if (![s1, l1, s2, l2].every((n) => Number.isFinite(n) && n >= 0) ||
        end1 > s2 ||
        end2 > buffer.length + 64) {
        return {
            hasSignature: true,
            isValid: false,
            detail: "Signature numérique rompue ou modifiée après émission.",
        };
    }
    const contentsGap = s2 - end1;
    const covered = l1 + l2;
    const slice2End = Math.min(end2, buffer.length);
    const signed = Buffer.concat([buffer.subarray(s1, Math.min(end1, buffer.length)), buffer.subarray(s2, slice2End)]);
    const sha256 = createHash("sha256").update(signed).digest("hex");
    const contentsLooksPresent = contentsGap >= 32;
    const coverageOk = Math.abs(buffer.length - covered - contentsGap) < 256;
    const hasContentsHex = /\/Contents\s*</i.test(rawStr);
    if (!contentsLooksPresent || !coverageOk || !hasContentsHex) {
        return {
            hasSignature: true,
            isValid: false,
            sha256,
            covered,
            detail: "Signature numérique rompue ou modifiée après émission.",
        };
    }
    return {
        hasSignature: true,
        isValid: true,
        sha256,
        covered,
        detail: `Signature numérique PKI présente (SHA-256 ${sha256.slice(0, 16)}…).`,
    };
}
function countPdfTextBlocks(rawStr) {
    return (rawStr.match(/\bBT\b/g) || []).length;
}
function countImageXObjects(rawStr) {
    const imageMarkers = rawStr.match(/\/Subtype\s*\/Image/gi) || [];
    const jpegFilters = rawStr.match(/\/(?:DCTDecode|JPXDecode|FlateDecode)/gi) || [];
    const widths = [...rawStr.matchAll(/\/Width\s+(\d+)/g)].map((m) => Number(m[1]));
    const heights = [...rawStr.matchAll(/\/Height\s+(\d+)/g)].map((m) => Number(m[1]));
    let largeOverlay = false;
    const n = Math.min(widths.length, heights.length);
    for (let i = 0; i < n; i++) {
        if (widths[i] * heights[i] >= 400_000) {
            largeOverlay = true;
            break;
        }
    }
    return {
        count: Math.max(imageMarkers.length, jpegFilters.length > 2 ? imageMarkers.length : imageMarkers.length),
        largeOverlay: largeOverlay || (imageMarkers.length > 0 && widths.some((w) => w >= 900)),
    };
}
export function analyzeDocumentSecurity(buffer, mimeType, quittanceNumber, referencePaiement) {
    const details = [];
    let hasDigitalSignature = false;
    let isSignatureValid = true;
    let signatureSha256;
    let byteRangeCovered;
    let isVectorDocument = true;
    let fontCount = 0;
    let textBlockCount = 0;
    let imageXObjectCount = 0;
    let hasImageOverlay = false;
    if (mimeType === "application/pdf") {
        const rawStr = buffer.toString("binary");
        const pki = analyzePdfByteRange(buffer, rawStr);
        hasDigitalSignature = pki.hasSignature;
        isSignatureValid = pki.isValid;
        signatureSha256 = pki.sha256;
        byteRangeCovered = pki.covered;
        details.push(pki.detail);
        const fontMatches = rawStr.match(/\/Type\s*\/Font|\/FontDescriptor|\/Subtype\s*\/(?:Type1|TrueType|Type0|CIDFontType0|CIDFontType2)/gi);
        fontCount = fontMatches ? fontMatches.length : 0;
        textBlockCount = countPdfTextBlocks(rawStr);
        const images = countImageXObjects(rawStr);
        imageXObjectCount = images.count;
        const hasTextStream = textBlockCount > 0 || /\/Tj|\/TJ|Tf\b/i.test(rawStr);
        const rasterOnly = images.count > 0 && fontCount === 0 && !hasTextStream;
        const overlayOnScan = images.largeOverlay && fontCount < 2;
        if (rasterOnly || overlayOnScan) {
            isVectorDocument = false;
            hasImageOverlay = true;
            details.push("Document non conforme : structure texte non vectorielle (image retouchée).");
        }
        else {
            isVectorDocument = fontCount > 0 || hasTextStream;
            hasImageOverlay = images.largeOverlay;
            details.push(isVectorDocument
                ? `Document vectoriel conforme (${fontCount} polices, ${textBlockCount} blocs BT/ET).`
                : "Document non conforme : structure texte non vectorielle (image retouchée).");
            if (!isVectorDocument)
                hasImageOverlay = true;
        }
    }
    else if (mimeType.startsWith("image/")) {
        isVectorDocument = false;
        hasImageOverlay = true;
        details.push("Fichier image raster (photo) — contrôle vectoriel ignoré pour ce type.");
    }
    const quittanceChecksumPassed = verifyQuittanceChecksum(quittanceNumber || "");
    const referenceChecksumPassed = verifyQuittanceChecksum(referencePaiement || "");
    if (!quittanceChecksumPassed) {
        details.push("Numéro de quittance non conforme (échec de la clé de contrôle mathématique).");
    }
    if (referencePaiement && !referenceChecksumPassed) {
        details.push("Référence de paiement non conforme (échec de la clé de contrôle mathématique).");
    }
    return {
        hasDigitalSignature,
        isSignatureValid: hasDigitalSignature ? isSignatureValid : true,
        signatureSha256,
        byteRangeCovered,
        isVectorDocument,
        fontCount,
        textBlockCount,
        imageXObjectCount,
        hasImageOverlay,
        quittanceChecksumPassed,
        referenceChecksumPassed,
        details,
    };
}
async function parseBuffer(buffer, mimeType) {
    const methods = [];
    let rawText = "";
    let qrUrl = null;
    let pdfInfoObj;
    if (mimeType === "application/pdf") {
        const parsed = await pdfParse(buffer, { max: 4 });
        rawText = parsed.text;
        pdfInfoObj = parsed.info;
        methods.push("pdf-parse");
        qrUrl = rawText.match(TREASURY_QR)?.[0] ?? null;
    }
    else if (mimeType.startsWith("image/")) {
        const image = await decodeImageBuffer(buffer, mimeType);
        const ocrSource = image ? downscaleForOcr(image) : null;
        const [qrResult, ocrText] = await Promise.all([
            image ? Promise.resolve(scanQrFromImage(image)) : Promise.resolve(null),
            ocrSource
                ? ocrImage({ data: ocrSource.data, width: ocrSource.width, height: ocrSource.height })
                : ocrImage(buffer),
        ]);
        qrUrl = qrResult;
        if (qrUrl)
            methods.push("jsQR");
        if (ocrText.trim()) {
            rawText = ocrText;
            methods.push("tesseract-ocr");
        }
        else if (qrUrl) {
            rawText = qrUrl;
        }
    }
    const metadataInfo = extractDocumentMetadata(buffer, mimeType, pdfInfoObj);
    const fields = parseTreasuryFields(rawText);
    if (!qrUrl && fields.qrUrl)
        qrUrl = fields.qrUrl;
    if (qrUrl && !rawText.includes(qrUrl))
        methods.push("qr-tresor");
    const securityAnalysis = analyzeDocumentSecurity(buffer, mimeType, fields.quittanceNumber, fields.referencePaiement);
    let confidence = 0.45;
    if (fields.quittanceNumber)
        confidence += 0.15;
    if (fields.studentName)
        confidence += 0.1;
    if (fields.tpCodeFromReceipt)
        confidence += 0.1;
    if (fields.amount > 0)
        confidence += 0.1;
    if (fields.paymentYear)
        confidence += 0.05;
    if (qrUrl)
        confidence += 0.15;
    if (fields.hasOfficialLogo)
        confidence += 0.05;
    return {
        ...fields,
        qrUrl,
        qrVerifiedOnline: false,
        confidence: Math.min(confidence, 0.98),
        rawText: rawText.slice(0, 8000),
        method: methods,
        metadataInfo,
        securityAnalysis,
    };
}
export async function parseReceiptFile(filePath, mimeType) {
    const buffer = await fs.readFile(filePath);
    return parseBuffer(buffer, mimeType);
}
export async function parseReceiptBuffer(buffer, mimeType) {
    return parseBuffer(buffer, mimeType);
}
/** Vérifie le QR Trésor — timeout court pour ne pas bloquer la réponse. */
export async function verifyTreasuryQr(qrUrl, extracted) {
    if (!qrUrl.includes("equittancetresor.finances.bj")) {
        return { ok: false, verifiedOnline: false, motif: "QR Code non officiel (domaine Trésor invalide)." };
    }
    if (!/verify=[a-f0-9]+/i.test(qrUrl)) {
        return { ok: false, verifiedOnline: false, motif: "QR Code Trésor invalide (token de vérification absent)." };
    }
    try {
        const res = await fetch(qrUrl, { signal: AbortSignal.timeout(2000) });
        if (!res.ok)
            return { ok: true, verifiedOnline: false };
        const html = await res.text();
        if (!html.trim())
            return { ok: true, verifiedOnline: false };
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
    }
    catch {
        return { ok: true, verifiedOnline: false };
    }
}

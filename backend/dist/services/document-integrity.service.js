/**
 * Détection de falsification : métadonnées PDF, éditeurs suspects,
 * montants / codes TP incohérents dans le même document.
 */
const AMOUNT_ARRETE = /somme\s+de\s*:[^(]*\(([0-9\s]{1,9})\)\s*FCFA/i;
const AMOUNT_TABLE = /(?:^|\n)\s*([0-9]{1,3}(?:\s[0-9]{3})+)\s*(?:\n|\r|$)/gm;
const AMOUNT_FCFA = /([0-9]{1,3}(?:[.\s][0-9]{3})+|[0-9]{2,6})\s*(?:FCFA|F\.?C\.?F\.?A)/gi;
const AMOUNT_MONTANT_LABEL = /montant[^0-9]{0,30}([0-9\s]{1,9})\s*(?:FCFA|F\.?C\.?F\.?A)?/gi;
const TP_CODE = /\(([A-Z]{2,5}\d{4}(?:-\d+)?)\)/g;
const SUSPICIOUS_PDF_TOOLS = [
    { pattern: /sejda/i, label: "Sejda PDF" },
    { pattern: /ilovepdf/i, label: "iLovePDF" },
    { pattern: /pdf24/i, label: "PDF24" },
    { pattern: /smallpdf/i, label: "Smallpdf" },
    { pattern: /pdfescape/i, label: "PDFescape" },
    { pattern: /soda\s*pdf/i, label: "Soda PDF" },
    { pattern: /pdfelement|wondershare/i, label: "PDFelement" },
    { pattern: /foxit\s*phantom/i, label: "Foxit PhantomPDF" },
    { pattern: /nitro\s*pro/i, label: "Nitro PDF" },
    { pattern: /pdf-xchange/i, label: "PDF-XChange" },
    { pattern: /canva/i, label: "Canva" },
    { pattern: /photoshop/i, label: "Adobe Photoshop" },
    { pattern: /gimp/i, label: "GIMP" },
    { pattern: /inkscape/i, label: "Inkscape" },
    { pattern: /online2pdf/i, label: "online2pdf" },
    { pattern: /pdf\s*editor/i, label: "PDF Editor générique" },
    { pattern: /pdfsam/i, label: "PDFsam" },
    { pattern: /libreoffice|openoffice/i, label: "LibreOffice (réédition)" },
];
function decodePdfString(value) {
    return value.replace(/\\([\\()nrtbf])/g, (_, c) => {
        if (c === "n")
            return "\n";
        if (c === "r")
            return "\r";
        if (c === "t")
            return "\t";
        return c;
    });
}
function pickPdfField(raw, key) {
    const paren = raw.match(new RegExp(`/${key}\\s*\\(([^)]*)\\)`, "i"));
    if (paren?.[1])
        return decodePdfString(paren[1]).trim() || null;
    const hex = raw.match(new RegExp(`/${key}\\s*<([0-9A-Fa-f\\s]+)>`, "i"));
    if (hex?.[1]) {
        try {
            const cleaned = hex[1].replace(/\s/g, "");
            let out = "";
            for (let i = 0; i < cleaned.length; i += 2) {
                out += String.fromCharCode(parseInt(cleaned.slice(i, i + 2), 16));
            }
            return out.trim() || null;
        }
        catch {
            return null;
        }
    }
    return null;
}
export function extractPdfMetaFromBuffer(buffer) {
    const raw = buffer.toString("latin1");
    return {
        producer: pickPdfField(raw, "Producer"),
        creator: pickPdfField(raw, "Creator"),
        author: pickPdfField(raw, "Author"),
        creationDate: pickPdfField(raw, "CreationDate"),
        modDate: pickPdfField(raw, "ModDate"),
        incrementalUpdates: (raw.match(/%%EOF/g) || []).length,
        hasJavaScript: /\/JavaScript|\/JS[\s/<(]/i.test(raw),
        hasAcroForm: /\/AcroForm/i.test(raw),
    };
}
function parsePdfMetaDate(value) {
    if (!value)
        return null;
    const m = value.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/i);
    if (!m)
        return null;
    return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), parseInt(m[4] ?? "0", 10), parseInt(m[5] ?? "0", 10), parseInt(m[6] ?? "0", 10));
}
function mergePdfMeta(rawMeta, pdfInfo) {
    const info = pdfInfo ?? {};
    return {
        producer: rawMeta.producer ?? (typeof info.Producer === "string" ? info.Producer : null),
        creator: rawMeta.creator ?? (typeof info.Creator === "string" ? info.Creator : null),
        author: rawMeta.author ?? (typeof info.Author === "string" ? info.Author : null),
        creationDate: rawMeta.creationDate ?? (typeof info.CreationDate === "string" ? info.CreationDate : null),
        modDate: rawMeta.modDate ?? (typeof info.ModDate === "string" ? info.ModDate : null),
        incrementalUpdates: rawMeta.incrementalUpdates,
        hasJavaScript: rawMeta.hasJavaScript,
        hasAcroForm: rawMeta.hasAcroForm,
    };
}
export function extractAmountSources(text, qrUrl) {
    const sources = [];
    const seen = new Set();
    const push = (source, amount, label) => {
        if (amount < 10 || amount > 500_000)
            return;
        const key = `${source}:${amount}`;
        if (seen.has(key))
            return;
        seen.add(key);
        sources.push({ source, amount, label });
    };
    const arret = text.match(AMOUNT_ARRETE);
    if (arret) {
        push("arrete", parseInt(arret[1].replace(/[^0-9]/g, ""), 10), "Somme arrêtée (légal)");
    }
    for (const m of text.matchAll(AMOUNT_TABLE)) {
        push("table", parseInt(m[1].replace(/\s/g, ""), 10), "Montant tableau");
    }
    for (const m of text.matchAll(AMOUNT_FCFA)) {
        push("fcfa", parseInt(m[1].replace(/[^0-9]/g, ""), 10), "Montant FCFA");
    }
    for (const m of text.matchAll(AMOUNT_MONTANT_LABEL)) {
        push("montant_label", parseInt(m[1].replace(/[^0-9]/g, ""), 10), "Champ Montant");
    }
    if (qrUrl) {
        const params = [...qrUrl.matchAll(/(?:montant|amount|m)=([0-9]+)/gi)];
        for (const p of params) {
            push("qr_param", parseInt(p[1], 10), "Paramètre QR");
        }
    }
    return sources;
}
export function extractTpCodes(text) {
    return [...new Set([...text.matchAll(TP_CODE)].map((m) => m[1].toUpperCase()))];
}
function checkSuspiciousEditor(meta) {
    const haystack = `${meta.producer ?? ""} ${meta.creator ?? ""} ${meta.author ?? ""}`;
    for (const tool of SUSPICIOUS_PDF_TOOLS) {
        if (tool.pattern.test(haystack)) {
            return {
                id: "pdf_editor",
                label: "Éditeur PDF suspect",
                passed: false,
                motif: `Document modifié avec un outil non officiel (${tool.label}). Quittance rejetée.`,
            };
        }
    }
    return { id: "pdf_editor", label: "Éditeur PDF suspect", passed: true };
}
function checkPdfStructure(meta) {
    if (meta.hasJavaScript) {
        return {
            id: "pdf_structure",
            label: "Structure PDF",
            passed: false,
            motif: "Le PDF contient du script embarqué (structure inhabituelle pour une quittance Trésor).",
        };
    }
    if (meta.incrementalUpdates >= 4) {
        return {
            id: "pdf_structure",
            label: "Structure PDF",
            passed: false,
            motif: `Document PDF ré-enregistré ${meta.incrementalUpdates} fois (signe de modification répétée).`,
        };
    }
    const created = parsePdfMetaDate(meta.creationDate);
    const modified = parsePdfMetaDate(meta.modDate);
    if (created && modified && modified.getTime() - created.getTime() > 3_600_000) {
        const haystack = `${meta.producer ?? ""} ${meta.creator ?? ""}`.toLowerCase();
        const trustedGenerator = /treasury|tresor|finances|dgtcp|itext|acrobat distiller|microsoft|chrome|wkhtml|reportlab/i.test(haystack);
        if (!trustedGenerator && meta.incrementalUpdates >= 2) {
            return {
                id: "pdf_structure",
                label: "Structure PDF",
                passed: false,
                motif: "Date de modification postérieure à la création — le PDF semble avoir été retouché après émission.",
            };
        }
    }
    return { id: "pdf_structure", label: "Structure PDF", passed: true };
}
function checkAmountConsistency(sources) {
    if (!sources.length) {
        return {
            id: "amount_consistency",
            label: "Cohérence des montants",
            passed: true,
            resolvedAmount: 0,
        };
    }
    const arrete = sources.find((s) => s.source === "arrete");
    const resolvedAmount = arrete?.amount ?? sources.find((s) => s.amount >= 50)?.amount ?? sources[0].amount;
    if (arrete) {
        const conflicts = sources.filter((s) => s.amount !== arrete.amount);
        if (conflicts.length) {
            const detail = [...new Set(conflicts.map((s) => `${s.amount} (${s.label})`))].join(" · ");
            return {
                id: "amount_consistency",
                label: "Cohérence des montants",
                passed: false,
                motif: `Montants incohérents : somme arrêtée ${arrete.amount} FCFA, mais aussi ${detail}. Possible falsification.`,
                resolvedAmount: arrete.amount,
            };
        }
        return {
            id: "amount_consistency",
            label: "Cohérence des montants",
            passed: true,
            resolvedAmount: arrete.amount,
        };
    }
    const significant = sources.filter((s) => s.amount >= 50);
    const unique = [...new Set(significant.map((s) => s.amount))];
    if (unique.length <= 1) {
        return {
            id: "amount_consistency",
            label: "Cohérence des montants",
            passed: true,
            resolvedAmount,
        };
    }
    return {
        id: "amount_consistency",
        label: "Cohérence des montants",
        passed: false,
        motif: `Plusieurs montants différents détectés : ${unique.join(", ")} FCFA. Document incohérent ou modifié.`,
        resolvedAmount,
    };
}
function checkTpConsistency(tpCodes, expectedTp) {
    if (tpCodes.length <= 1) {
        if (expectedTp && tpCodes.length === 1 && tpCodes[0] !== expectedTp.toUpperCase()) {
            return {
                id: "tp_consistency",
                label: "Cohérence code TP",
                passed: false,
                motif: `Code TP « ${tpCodes[0]} » sur la quittance ≠ « ${expectedTp} » saisi.`,
            };
        }
        return { id: "tp_consistency", label: "Cohérence code TP", passed: true };
    }
    return {
        id: "tp_consistency",
        label: "Cohérence code TP",
        passed: false,
        motif: `Plusieurs codes TP dans le même document : ${tpCodes.join(", ")}.`,
    };
}
export function analyzeDocumentIntegrity(buffer, rawText, options, pdfInfo) {
    const checks = [];
    let pdfMeta = null;
    const qrUrl = rawText.match(/https:\/\/equittancetresor\.finances\.bj[^\s"'>\])]+/i)?.[0] ?? null;
    const amountSources = extractAmountSources(rawText, qrUrl);
    const tpCodesFound = extractTpCodes(rawText);
    const amountResult = checkAmountConsistency(amountSources);
    checks.push({
        id: amountResult.id,
        label: amountResult.label,
        passed: amountResult.passed,
        motif: amountResult.motif,
    });
    if (options.checkTpConsistency !== false) {
        checks.push(checkTpConsistency(tpCodesFound, options.expectedTp));
    }
    if (options.mimeType === "application/pdf") {
        pdfMeta = mergePdfMeta(extractPdfMetaFromBuffer(buffer), pdfInfo);
        if (options.checkSuspiciousEditors !== false) {
            checks.push(checkSuspiciousEditor(pdfMeta));
        }
        if (options.checkPdfMeta !== false) {
            checks.push(checkPdfStructure(pdfMeta));
        }
    }
    const failed = checks.find((c) => !c.passed);
    return {
        checks,
        pdfMeta,
        amountSources,
        tpCodesFound,
        resolvedAmount: amountResult.resolvedAmount,
        passed: !failed,
        blockingMotif: failed?.motif,
    };
}
export function getIntegrityCheck(report, id) {
    return report.checks.find((c) => c.id === id);
}

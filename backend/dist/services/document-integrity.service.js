/**
 * Cohérence du contenu extrait (montants, codes TP) et métadonnées logiciels.
 */
const AMOUNT_ARRETE = /somme\s+de\s*:[^(]*\(([0-9\s]{1,9})\)\s*FCFA/i;
const AMOUNT_TABLE = /(?:^|\n)\s*([0-9]{1,3}(?:\s[0-9]{3})+)\s*(?:\n|\r|$)/gm;
const AMOUNT_FCFA = /([0-9]{1,3}(?:[.\s][0-9]{3})+|[0-9]{2,6})\s*(?:FCFA|F\.?C\.?F\.?A)/gi;
const AMOUNT_MONTANT_LABEL = /montant[^0-9]{0,30}([0-9\s]{1,9})\s*(?:FCFA|F\.?C\.?F\.?A)?/gi;
const TP_CODE = /\(([A-Z]{2,5}\d{4}(?:-\d+)?)\)/g;
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
        for (const p of qrUrl.matchAll(/(?:montant|amount|m)=([0-9]+)/gi)) {
            push("qr_param", parseInt(p[1], 10), "Paramètre QR");
        }
    }
    return sources;
}
export function extractTpCodes(text) {
    return [...new Set([...text.matchAll(TP_CODE)].map((m) => m[1].toUpperCase()))];
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
function checkMetadataIntegrity(metadataInfo) {
    if (!metadataInfo || !metadataInfo.isModified) {
        return {
            id: "metadata_software_tool",
            label: "Intégrité des métadonnées logiciels",
            passed: true,
        };
    }
    const tools = metadataInfo.detectedEditingTools.join(", ");
    return {
        id: "metadata_software_tool",
        label: "Intégrité des métadonnées logiciels",
        passed: false,
        motif: `Quittance refusée : le document a été modifié ou retouché via un logiciel tier (« ${tools} »).`,
    };
}
function checkPkiSignature(security) {
    if (!security || !security.hasDigitalSignature) {
        return { id: "pki_signature", label: "Signature numérique PKI", passed: true };
    }
    if (!security.isSignatureValid) {
        return {
            id: "pki_signature",
            label: "Signature numérique PKI",
            passed: false,
            motif: "Signature numérique rompue ou modifiée après émission.",
        };
    }
    return { id: "pki_signature", label: "Signature numérique PKI", passed: true };
}
function checkVectorStructure(security, mimeType) {
    if (!security || mimeType?.startsWith("image/")) {
        return { id: "vector_structure", label: "Structure vectorielle", passed: true };
    }
    if (!security.isVectorDocument || security.hasImageOverlay && security.fontCount < 2) {
        return {
            id: "vector_structure",
            label: "Structure vectorielle",
            passed: false,
            motif: "Document non conforme : structure texte non vectorielle (image retouchée).",
        };
    }
    return { id: "vector_structure", label: "Structure vectorielle", passed: true };
}
function checkQuittanceChecksum(security) {
    if (!security) {
        return { id: "quittance_checksum", label: "Clé de contrôle du numéro", passed: true };
    }
    if (!security.quittanceChecksumPassed) {
        return {
            id: "quittance_checksum",
            label: "Clé de contrôle du numéro",
            passed: false,
            motif: "Numéro de quittance non conforme (échec de la clé de contrôle mathématique).",
        };
    }
    if (security.referenceChecksumPassed === false) {
        return {
            id: "quittance_checksum",
            label: "Clé de contrôle du numéro",
            passed: false,
            motif: "Numéro de quittance non conforme (échec de la clé de contrôle mathématique).",
        };
    }
    return { id: "quittance_checksum", label: "Clé de contrôle du numéro", passed: true };
}
export function analyzeDocumentIntegrity(rawText, options) {
    const checks = [];
    const qrUrl = rawText.match(/https:\/\/equittancetresor\.finances\.bj[^\s"'>\])]+/i)?.[0] ?? null;
    const amountSources = extractAmountSources(rawText, qrUrl);
    const tpCodesFound = extractTpCodes(rawText);
    if (options.checkNoModificationSoftware !== false && options.metadataInfo) {
        checks.push(checkMetadataIntegrity(options.metadataInfo));
    }
    if (options.checkPkiSignature) {
        checks.push(checkPkiSignature(options.securityAnalysis));
    }
    if (options.checkVectorStructure) {
        checks.push(checkVectorStructure(options.securityAnalysis, options.mimeType));
    }
    if (options.checkQuittanceChecksum) {
        checks.push(checkQuittanceChecksum(options.securityAnalysis));
    }
    const amountResult = checkAmountConsistency(amountSources);
    if (options.checkAmountConsistency !== false) {
        checks.push({
            id: amountResult.id,
            label: amountResult.label,
            passed: amountResult.passed,
            motif: amountResult.motif,
        });
    }
    if (options.checkTpConsistency !== false) {
        checks.push(checkTpConsistency(tpCodesFound, options.expectedTp));
    }
    const failed = checks.find((c) => !c.passed);
    return {
        checks,
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

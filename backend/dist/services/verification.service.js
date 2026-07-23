import { getSupabaseAdmin, isSupabaseConfigured } from "../lib/supabase.js";
import { parseReceiptFile } from "./receipt-parser.service.js";
export const DEFAULT_RULES = {
    expectedAmount: 2500,
    academicYear: "2025-2026",
    treasuryAccountNumber: "",
    paymentTitle: "FAST/PRODUITS ACCESSOIRES",
    allowedDateFrom: null,
    allowedDateTo: null,
    treasuryDomain: "equittancetresor.finances.bj",
    requireQrCode: false,
    requireOfficialLogo: false,
    customRules: [],
};
export async function getValidationRules() {
    if (!isSupabaseConfigured())
        return DEFAULT_RULES;
    const { data } = await getSupabaseAdmin().from("validation_settings").select("key, value");
    if (!data?.length)
        return DEFAULT_RULES;
    const merged = { ...DEFAULT_RULES };
    for (const row of data) {
        let val = row.value;
        if (typeof val === "string") {
            try {
                val = JSON.parse(val);
            }
            catch { /* keep string */ }
        }
        merged[row.key] = val;
    }
    return merged;
}
export async function upsertValidationRules(rules) {
    const sb = getSupabaseAdmin();
    for (const [key, value] of Object.entries(rules)) {
        await sb.from("validation_settings").upsert({ key, value, label: key, category: "validation", updated_at: new Date().toISOString() }, { onConflict: "key" });
    }
    return getValidationRules();
}
function normalizeName(name) {
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}
function namesMatch(formName, receiptName) {
    if (!receiptName.trim())
        return true; // pas de nom sur quittance → accepter si autres checks OK
    const form = normalizeName(formName);
    const receipt = normalizeName(receiptName);
    const parts = form.split(/\s+/).filter((p) => p.length > 2);
    return parts.some((part) => receipt.includes(part));
}
function parseDate(value) {
    if (!value)
        return null;
    const fr = value.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (fr) {
        const year = fr[3].length === 2 ? `20${fr[3]}` : fr[3];
        return new Date(`${year}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}`);
    }
    return null;
}
export async function verifyReceipt(input, rules) {
    let extracted;
    try {
        extracted = await parseReceiptFile(input.filePath, input.mimeType);
    }
    catch (error) {
        return {
            success: false,
            motif: error instanceof Error ? error.message : "Impossible de lire le document.",
        };
    }
    const fullName = `${input.prenom} ${input.nom}`.trim();
    const expectedAmount = input.expectedAmount || rules.expectedAmount;
    if (!extracted.quittanceNumber && extracted.confidence < 0.6) {
        return {
            success: false,
            motif: "Document illisible ou format non reconnu. Utilisez un PDF officiel du Trésor.",
            extracted,
        };
    }
    if (extracted.studentName && !namesMatch(fullName, extracted.studentName)) {
        return {
            success: false,
            motif: `Nom sur la quittance (${extracted.studentName}) ne correspond pas à ${fullName}.`,
            extracted,
        };
    }
    const amount = extracted.amount || expectedAmount;
    if (expectedAmount > 0 && extracted.amount > 0 && extracted.amount !== expectedAmount) {
        return {
            success: false,
            motif: `Montant incorrect : ${extracted.amount} FCFA (attendu ${expectedAmount} FCFA pour ${input.codeTp}).`,
            extracted,
        };
    }
    if (rules.requireQrCode && !extracted.qrUrl) {
        return { success: false, motif: "QR Code officiel du Trésor introuvable.", extracted };
    }
    if (extracted.qrUrl && !extracted.qrUrl.includes(rules.treasuryDomain)) {
        return {
            success: false,
            motif: "QR Code non officiel (domaine Trésor invalide).",
            extracted,
        };
    }
    if (rules.requireOfficialLogo && !extracted.hasOfficialLogo) {
        return { success: false, motif: "Mentions officielles du Trésor non détectées.", extracted };
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
        extracted: { ...extracted, amount: amount || expectedAmount },
        confidence: extracted.confidence,
    };
}
export async function uploadQuittance(buffer, filename, mimeType) {
    if (!isSupabaseConfigured())
        return filename;
    const path = `${Date.now()}-${filename}`;
    const { error } = await getSupabaseAdmin().storage
        .from("quittances")
        .upload(path, buffer, { contentType: mimeType, upsert: false });
    if (error)
        throw new Error(`Upload Storage : ${error.message}`);
    return path;
}

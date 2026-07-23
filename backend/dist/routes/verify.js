import { Router } from "express";
import multer from "multer";
import { getSupabaseAdmin, isSupabaseConfigured } from "../lib/supabase.js";
import { getValidationRules, verifyReceipt, uploadQuittance } from "../services/verification.service.js";
import { lookupTp, listActiveTp } from "../data/tp-catalog.js";
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
        cb(null, allowed.includes(file.mimetype));
    },
});
export const verifyRouter = Router();
verifyRouter.get("/tp", async (req, res) => {
    const filiere = String(req.query.filiere ?? "").trim().toUpperCase();
    let list = await listActiveTp();
    if (filiere)
        list = list.filter((tp) => tp.filiere === filiere);
    return res.json(list);
});
verifyRouter.get("/tp/:code", async (req, res) => {
    const code = decodeURIComponent(req.params.code);
    const tp = await lookupTp(code);
    if (!tp)
        return res.status(404).json({ error: "Code TP inconnu." });
    return res.json(tp);
});
verifyRouter.post("/", upload.single("quittance"), async (req, res) => {
    try {
        const { nom, prenom, matricule, filiere, codeTp } = req.body;
        if (!nom?.trim() || !prenom?.trim() || !matricule?.trim() || !filiere?.trim() || !codeTp?.trim()) {
            return res.status(400).json({ error: "Nom, prénom, matricule, filière et code TP sont obligatoires." });
        }
        if (!req.file) {
            return res.status(400).json({ error: "Joignez votre quittance (PDF ou image)." });
        }
        const [tp, rules] = await Promise.all([lookupTp(codeTp), getValidationRules()]);
        if (!tp) {
            return res.status(400).json({ error: `Code TP « ${codeTp} » introuvable dans le catalogue.` });
        }
        if (tp.filiere !== filiere.trim().toUpperCase() && !filiere.toUpperCase().startsWith(tp.filiere)) {
            return res.status(400).json({
                error: `Le TP ${codeTp} appartient à la filière ${tp.filiere}, pas ${filiere}.`,
            });
        }
        const result = await verifyReceipt({
            nom: nom.trim(),
            prenom: prenom.trim(),
            matricule: matricule.trim().toUpperCase(),
            filiere: filiere.trim().toUpperCase(),
            codeTp: tp.code,
            tpTitle: tp.title,
            expectedAmount: tp.montant,
            fileBuffer: req.file.buffer,
            mimeType: req.file.mimetype,
        }, rules);
        const storagePath = await uploadQuittance(req.file.buffer, req.file.originalname, req.file.mimetype).catch(() => `${Date.now()}-${req.file.originalname}`);
        if (!result.success) {
            if (isSupabaseConfigured()) {
                await getSupabaseAdmin().from("failed_verifications").insert({
                    nom, prenom, matricule, filiere, code_tp: tp.code,
                    motif: result.motif, fichier: storagePath,
                    metadata: result.extracted ? { extracted: result.extracted, methods: result.extracted.method } : null,
                });
            }
            return res.status(422).json({ success: false, motif: result.motif });
        }
        if (isSupabaseConfigured()) {
            const { data: existing } = await getSupabaseAdmin()
                .from("validated_students")
                .select("id")
                .eq("numero_quittance", result.extracted.quittanceNumber || result.validationId)
                .maybeSingle();
            if (existing) {
                await getSupabaseAdmin().from("failed_verifications").insert({
                    nom, prenom, matricule, filiere, code_tp: tp.code,
                    motif: "Quittance déjà enregistrée.", fichier: storagePath,
                });
                return res.status(409).json({ success: false, motif: "Cette quittance a déjà été utilisée." });
            }
            const datePaiement = result.extracted.datePaiement
                ? parseFlexibleDate(result.extracted.datePaiement)
                : null;
            const { data: student, error } = await getSupabaseAdmin()
                .from("validated_students")
                .insert({
                nom: nom.trim(),
                prenom: prenom.trim(),
                matricule: matricule.trim().toUpperCase(),
                filiere: filiere.trim().toUpperCase(),
                code_tp: tp.code,
                tp_title: tp.title,
                numero_quittance: result.extracted.quittanceNumber || result.validationId,
                reference_paiement: result.extracted.referencePaiement || null,
                montant: result.extracted.amount,
                date_paiement: datePaiement,
                fichier_quittance: storagePath,
                validation_id: result.validationId,
                confidence: result.confidence,
                metadata: { extracted: result.extracted, parseMethods: result.extracted.method },
            })
                .select()
                .single();
            if (error)
                throw new Error(error.message);
            return res.json({
                success: true,
                message: "Paiement vérifié avec succès.",
                validationId: student.validation_id,
                attestation: {
                    nom: student.nom,
                    prenom: student.prenom,
                    matricule: student.matricule,
                    filiere: student.filiere,
                    codeTp: student.code_tp,
                    tpTitle: student.tp_title,
                    numeroQuittance: student.numero_quittance,
                    montant: student.montant,
                    dateVerification: student.date_verification,
                },
            });
        }
        return res.json({
            success: true,
            validationId: result.validationId,
            attestation: {
                nom, prenom, matricule, filiere,
                codeTp: tp.code, tpTitle: tp.title,
                montant: result.extracted.amount,
            },
            warning: "Supabase non configuré — enregistrement non persisté.",
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: error instanceof Error ? error.message : "Erreur serveur." });
    }
});
verifyRouter.get("/status/:validationId", async (req, res) => {
    if (!isSupabaseConfigured()) {
        return res.status(503).json({ error: "Supabase requis pour la consultation." });
    }
    const { data } = await getSupabaseAdmin()
        .from("validated_students")
        .select("validation_id, nom, prenom, matricule, filiere, code_tp, tp_title, numero_quittance, montant, date_verification, statut")
        .eq("validation_id", req.params.validationId)
        .maybeSingle();
    if (!data)
        return res.status(404).json({ error: "Identifiant introuvable." });
    return res.json(data);
});
function parseFlexibleDate(value) {
    const fr = value.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (!fr)
        return null;
    const year = fr[3].length === 2 ? `20${fr[3]}` : fr[3];
    return `${year}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}`;
}

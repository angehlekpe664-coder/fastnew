import { Router } from "express";
import { getSupabaseAdmin, isSupabaseConfigured } from "../../lib/supabase.js";
import { requireSupabaseAdmin } from "../../middleware/supabase-auth.js";
import { invalidateTpCache } from "../../data/tp-catalog.js";
import { getValidationRules, upsertValidationRules } from "../../services/verification.service.js";
import { exportStudentsToCsv, exportStudentsToExcel, exportStudentsToPdf, } from "../../services/export.service.js";
export const adminRouter = Router();
adminRouter.use(requireSupabaseAdmin);
adminRouter.get("/me", async (req, res) => {
    const admin = req.admin;
    const { data } = await getSupabaseAdmin()
        .from("admin_profiles")
        .select("nom, role")
        .eq("id", admin.id)
        .single();
    return res.json({ ...admin, nom: data?.nom ?? "Admin", role: data?.role ?? "admin" });
});
adminRouter.get("/stats", async (_req, res) => {
    const sb = getSupabaseAdmin();
    const [{ count: validated }, { count: failed }, { data: rows }] = await Promise.all([
        sb.from("validated_students").select("*", { count: "exact", head: true }),
        sb.from("failed_verifications").select("*", { count: "exact", head: true }),
        sb.from("validated_students").select("filiere, code_tp, tp_title"),
    ]);
    const v = validated ?? 0;
    const f = failed ?? 0;
    const total = v + f;
    const byFiliere = {};
    const byTp = {};
    for (const row of rows ?? []) {
        byFiliere[row.filiere] = (byFiliere[row.filiere] ?? 0) + 1;
        const key = row.code_tp;
        if (!byTp[key])
            byTp[key] = { code: row.code_tp, title: row.tp_title, count: 0 };
        byTp[key].count += 1;
    }
    return res.json({
        validated: v,
        failed: f,
        total,
        validationRate: total > 0 ? Math.round((v / total) * 100) : 0,
        byFiliere: Object.entries(byFiliere).map(([filiere, count]) => ({ filiere, count })),
        byTp: Object.values(byTp).sort((a, b) => b.count - a.count),
    });
});
adminRouter.get("/students", async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    const codeTp = String(req.query.codeTp ?? "").trim().toUpperCase();
    let query = getSupabaseAdmin()
        .from("validated_students")
        .select("*")
        .order("date_verification", { ascending: false });
    if (codeTp)
        query = query.eq("code_tp", codeTp);
    if (q) {
        query = query.or(`nom.ilike.%${q}%,prenom.ilike.%${q}%,matricule.ilike.%${q}%,filiere.ilike.%${q}%,numero_quittance.ilike.%${q}%,validation_id.ilike.%${q}%`);
    }
    const { data, error } = await query;
    if (error)
        return res.status(500).json({ error: error.message });
    return res.json(data);
});
adminRouter.get("/failures", async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    let query = getSupabaseAdmin()
        .from("failed_verifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
    if (q) {
        query = query.or(`nom.ilike.%${q}%,prenom.ilike.%${q}%,motif.ilike.%${q}%,matricule.ilike.%${q}%`);
    }
    const { data, error } = await query;
    if (error)
        return res.status(500).json({ error: error.message });
    return res.json(data);
});
adminRouter.get("/settings", async (_req, res) => {
    return res.json(await getValidationRules());
});
adminRouter.put("/settings", async (req, res) => {
    return res.json(await upsertValidationRules(req.body));
});
adminRouter.get("/tp-catalog", async (_req, res) => {
    const { data, error } = await getSupabaseAdmin()
        .from("tp_catalog")
        .select("code, title, filiere, montant, actif, created_at")
        .order("code");
    if (error)
        return res.status(500).json({ error: error.message });
    return res.json(data ?? []);
});
adminRouter.post("/tp-catalog", async (req, res) => {
    const { code, title, filiere, montant, actif = true } = req.body;
    if (!code?.trim() || !title?.trim() || !filiere?.trim()) {
        return res.status(400).json({ error: "Code, titre et filière obligatoires." });
    }
    const codeNorm = String(code).trim().toUpperCase();
    const row = {
        code: codeNorm,
        title: String(title).trim(),
        filiere: String(filiere).trim().toUpperCase(),
        montant: Number(montant) || 1000,
        actif: Boolean(actif),
    };
    const sb = getSupabaseAdmin();
    const { error: upsertError } = await sb.from("tp_catalog").upsert(row, { onConflict: "code" });
    if (upsertError)
        return res.status(500).json({ error: upsertError.message });
    const { data, error } = await sb.from("tp_catalog").select("code, title, filiere, montant, actif").eq("code", codeNorm).single();
    if (error || !data)
        return res.status(500).json({ error: error?.message ?? "TP introuvable après enregistrement." });
    invalidateTpCache();
    return res.status(201).json(data);
});
adminRouter.patch("/tp-catalog/:code", async (req, res) => {
    const code = decodeURIComponent(req.params.code).toUpperCase();
    const { title, filiere, montant, actif } = req.body;
    const patch = {};
    if (title !== undefined)
        patch.title = String(title).trim();
    if (filiere !== undefined)
        patch.filiere = String(filiere).trim().toUpperCase();
    if (montant !== undefined)
        patch.montant = Number(montant);
    if (actif !== undefined)
        patch.actif = Boolean(actif);
    if (!Object.keys(patch).length) {
        return res.status(400).json({ error: "Aucune modification fournie." });
    }
    const { data, error } = await getSupabaseAdmin()
        .from("tp_catalog")
        .update(patch)
        .eq("code", code)
        .select("code, title, filiere, montant, actif")
        .maybeSingle();
    if (error)
        return res.status(500).json({ error: error.message });
    if (!data)
        return res.status(404).json({ error: `TP « ${code} » introuvable.` });
    invalidateTpCache(code);
    return res.json(data);
});
adminRouter.get("/export/:format", async (req, res) => {
    const { data } = await getSupabaseAdmin()
        .from("validated_students")
        .select("*")
        .order("date_verification", { ascending: false });
    const students = (data ?? []);
    const format = req.params.format;
    if (format === "csv") {
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", 'attachment; filename="etudiants-valides.csv"');
        return res.send(exportStudentsToCsv(students));
    }
    if (format === "xlsx") {
        const buffer = await exportStudentsToExcel(students);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", 'attachment; filename="etudiants-valides.xlsx"');
        return res.send(buffer);
    }
    if (format === "pdf") {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Content-Disposition", 'attachment; filename="etudiants-valides.txt"');
        return res.send(exportStudentsToPdf(students));
    }
    return res.status(400).json({ error: "Format : csv, xlsx ou pdf." });
});
adminRouter.get("/health", (_req, res) => {
    res.json({ supabase: isSupabaseConfigured() });
});

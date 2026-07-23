import { Router } from "express";
import { getSupabaseAdmin, isSupabaseConfigured } from "../../lib/supabase.js";
import { requireSupabaseAdmin } from "../../middleware/supabase-auth.js";
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
    const [{ count: validated }, { count: failed }, { data: byFiliere }] = await Promise.all([
        sb.from("validated_students").select("*", { count: "exact", head: true }),
        sb.from("failed_verifications").select("*", { count: "exact", head: true }),
        sb.from("validated_students").select("filiere"),
    ]);
    const v = validated ?? 0;
    const f = failed ?? 0;
    const total = v + f;
    const counts = {};
    for (const row of byFiliere ?? []) {
        counts[row.filiere] = (counts[row.filiere] ?? 0) + 1;
    }
    return res.json({
        validated: v,
        failed: f,
        total,
        validationRate: total > 0 ? Math.round((v / total) * 100) : 0,
        byFiliere: Object.entries(counts).map(([filiere, count]) => ({ filiere, count })),
    });
});
adminRouter.get("/students", async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    let query = getSupabaseAdmin()
        .from("validated_students")
        .select("*")
        .order("date_verification", { ascending: false });
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

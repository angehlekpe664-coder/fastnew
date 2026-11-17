import { Router } from "express";
import multer from "multer";
import { getSupabaseAdmin, isSupabaseConfigured } from "../../lib/supabase.js";
import { requireSupabaseAdmin } from "../../middleware/supabase-auth.js";
import { invalidateTpCache } from "../../data/tp-catalog.js";
import { getValidationRules, upsertValidationRules } from "../../services/verification.service.js";
import {
  exportStudentsToCsv,
  exportStudentsToExcel,
  exportStudentsToPdf,
} from "../../services/export.service.js";
import {
  importOfficialStudents,
  generateReconciledTpExcel,
} from "../../services/official-students.service.js";
import { logger } from "../../logger.js";

type StudentRow = {
  validation_id: string;
  nom: string;
  prenom: string;
  matricule: string;
  filiere: string;
  code_tp: string;
  tp_title: string;
  numero_quittance: string;
  montant: number;
  date_paiement: string | null;
  date_verification: string;
  statut: string;
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

export const adminRouter = Router();

adminRouter.use(requireSupabaseAdmin);

adminRouter.get("/me", async (req, res, next) => {
  try {
    const admin = (req as typeof req & { admin: { id: string; email: string } }).admin;
    const { data } = await getSupabaseAdmin()
      .from("admin_profiles")
      .select("nom, role")
      .eq("id", admin.id)
      .maybeSingle();
    return res.json({ ...admin, nom: data?.nom ?? "Admin", role: data?.role ?? "admin" });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/stats", async (_req, res, next) => {
  try {
    const sb = getSupabaseAdmin();
    const [{ count: validated }, { count: failed }, { data: rows }, { data: failRows }, { count: officialCount }] = await Promise.all([
      sb.from("validated_students").select("*", { count: "exact", head: true }),
      sb.from("failed_verifications").select("*", { count: "exact", head: true }),
      sb.from("validated_students").select("filiere, code_tp, tp_title"),
      sb.from("failed_verifications").select("motif, filiere, code_tp"),
      sb.from("official_students").select("*", { count: "exact", head: true }),
    ]);

    const v = validated ?? 0;
    const f = failed ?? 0;
    const total = v + f;

    const byFiliere: Record<string, number> = {};
    const byTp: Record<string, { code: string; title: string; count: number }> = {};
    const failureMotifs: Record<string, number> = {};

    for (const row of rows ?? []) {
      const filiereKey = (row.filiere || "INCONNU").toUpperCase();
      byFiliere[filiereKey] = (byFiliere[filiereKey] ?? 0) + 1;

      const key = row.code_tp;
      if (!byTp[key]) byTp[key] = { code: row.code_tp, title: row.tp_title, count: 0 };
      byTp[key].count += 1;
    }

    for (const row of failRows ?? []) {
      let motifCategory = "Autre motif";
      const m = (row.motif || "").toLowerCase();
      if (m.includes("falsification") || m.includes("altération") || m.includes("icuid") || m.includes("iceni")) {
        motifCategory = "Tentative de falsification PDF";
      } else if (m.includes("nom") || m.includes("identité") || m.includes("concordante")) {
        motifCategory = "Identité non concordante";
      } else if (m.includes("code tp") || m.includes("filière")) {
        motifCategory = "Code TP / Filière incorrect";
      } else if (m.includes("déjà") || m.includes("enregistrée")) {
        motifCategory = "Quittance déjà utilisée";
      } else if (m.includes("montant")) {
        motifCategory = "Erreur de montant";
      } else if (m.includes("qr")) {
        motifCategory = "QR Code non valide";
      } else if (m.includes("officielle")) {
        motifCategory = "Étudiant non inscrit en base officielle";
      }
      failureMotifs[motifCategory] = (failureMotifs[motifCategory] ?? 0) + 1;
    }

    return res.json({
      validated: v,
      failed: f,
      total,
      officialRosterCount: officialCount ?? 0,
      validationRate: total > 0 ? Math.round((v / total) * 100) : 0,
      byFiliere: Object.entries(byFiliere).map(([filiere, count]) => ({ filiere, count })),
      byTp: Object.values(byTp).sort((a, b) => b.count - a.count),
      failureMotifs: Object.entries(failureMotifs).map(([motif, count]) => ({ motif, count })),
    });
  } catch (error) {
    next(error);
  }
});

/** Importation de la base officielle d'étudiants autorisés (Excel) */
adminRouter.post(
  "/official-students/import",
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Veuillez téléverser un fichier Excel (.xlsx)." });
      }

      const mode = (req.body?.mode === "replace" ? "replace" : "merge") as "replace" | "merge";
      const result = await importOfficialStudents(req.file.buffer, mode);

      logger.info(`Base officielle d'étudiants importée par l'admin (${result.count} étudiants, mode=${result.mode})`);
      return res.json({
        success: true,
        count: result.count,
        mode: result.mode,
        message: `${result.count} étudiant(s) répertorié(s) avec succès dans la base officielle.`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/** Consultation de la base officielle des étudiants */
adminRouter.get("/official-students", async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const filiere = String(req.query.filiere ?? "").trim().toUpperCase();

    let query = getSupabaseAdmin()
      .from("official_students")
      .select("*")
      .order("matricule", { ascending: true });

    if (filiere) query = query.eq("filiere", filiere);
    if (q) {
      query = query.or(`nom.ilike.%${q}%,prenom.ilike.%${q}%,matricule.ilike.%${q}%,filiere.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data ?? []);
  } catch (error) {
    next(error);
  }
});

/** Suppression d'un étudiant de la base officielle */
adminRouter.delete("/official-students/:matricule", async (req, res, next) => {
  try {
    const matricule = decodeURIComponent(req.params.matricule).trim().toUpperCase();
    const { error } = await getSupabaseAdmin()
      .from("official_students")
      .delete()
      .eq("matricule", matricule);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, message: `Matricule ${matricule} retiré de la base officielle.` });
  } catch (error) {
    next(error);
  }
});

/** Réconciliation & Génération du PV de Présence TP Excel avec onglets par filière */
adminRouter.post(
  "/reconcile-excel",
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Veuillez téléverser le fichier Excel des étudiants." });
      }

      const reconciledBuffer = await generateReconciledTpExcel(req.file.buffer);

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="PV-Presence-TP-Reconcilie-${Date.now()}.xlsx"`
      );
      return res.send(reconciledBuffer);
    } catch (error) {
      next(error);
    }
  }
);

/** Liste des filières enregistrées */
adminRouter.get("/filieres", async (_req, res, next) => {
  try {
    const sb = getSupabaseAdmin();
    const [{ data: catalog }, { data: students }, { data: official }] = await Promise.all([
      sb.from("tp_catalog").select("filiere"),
      sb.from("validated_students").select("filiere"),
      sb.from("official_students").select("filiere"),
    ]);

    const set = new Set<string>();
    for (const item of catalog ?? []) if (item.filiere) set.add(item.filiere.toUpperCase());
    for (const item of students ?? []) if (item.filiere) set.add(item.filiere.toUpperCase());
    for (const item of official ?? []) if (item.filiere) set.add(item.filiere.toUpperCase());

    return res.json(Array.from(set).sort());
  } catch (error) {
    next(error);
  }
});

/** Consultation filtrée des étudiants (filière, TP, recherche) */
adminRouter.get("/students", async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const filiere = String(req.query.filiere ?? "").trim().toUpperCase();
    const codeTp = String(req.query.codeTp ?? "").trim().toUpperCase();

    let query = getSupabaseAdmin()
      .from("validated_students")
      .select("*")
      .order("date_verification", { ascending: false });

    if (filiere) query = query.eq("filiere", filiere);
    if (codeTp) query = query.eq("code_tp", codeTp);

    if (q) {
      query = query.or(
        `nom.ilike.%${q}%,prenom.ilike.%${q}%,matricule.ilike.%${q}%,filiere.ilike.%${q}%,numero_quittance.ilike.%${q}%,validation_id.ilike.%${q}%`
      );
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data ?? []);
  } catch (error) {
    next(error);
  }
});

/** Suppression d'un étudiant validé */
adminRouter.delete("/students/:validationId", async (req, res, next) => {
  try {
    const { validationId } = req.params;
    const { error } = await getSupabaseAdmin()
      .from("validated_students")
      .delete()
      .eq("validation_id", validationId);

    if (error) return res.status(500).json({ error: error.message });
    logger.info(`Révocation étudiant ${validationId} effectuée par l'admin.`);
    return res.json({ success: true, message: "Enregistrement révoqué avec succès." });
  } catch (error) {
    next(error);
  }
});

/** Tri & Filtrage des échecs (failures) par filière, TP, motif et mot-clé */
adminRouter.get("/failures", async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const filiere = String(req.query.filiere ?? "").trim().toUpperCase();
    const codeTp = String(req.query.codeTp ?? "").trim().toUpperCase();
    const motif = String(req.query.motif ?? "").trim();
    const since = String(req.query.since ?? "").trim();
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "100"), 10) || 100, 1), 300);

    let query = getSupabaseAdmin()
      .from("failed_verifications")
      .select("id, nom, prenom, matricule, filiere, code_tp, motif, created_at, fichier, metadata")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (filiere) query = query.eq("filiere", filiere);
    if (codeTp) query = query.eq("code_tp", codeTp);
    if (motif) query = query.ilike("motif", `%${motif}%`);
    if (since) query = query.gt("created_at", since);

    if (q) {
      query = query.or(
        `nom.ilike.%${q}%,prenom.ilike.%${q}%,motif.ilike.%${q}%,matricule.ilike.%${q}%,code_tp.ilike.%${q}%,filiere.ilike.%${q}%`
      );
    }

    const [{ data, error }, { count: totalToday }] = await Promise.all([
      query,
      getSupabaseAdmin()
        .from("failed_verifications")
        .select("*", { count: "exact", head: true })
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    ]);

    if (error) return res.status(500).json({ error: error.message });

    res.set("Cache-Control", "private, no-cache");
    return res.json({
      items: data ?? [],
      meta: { totalToday: totalToday ?? 0, limit, since: since || null },
    });
  } catch (error) {
    next(error);
  }
});

/** Suppression d'un échec de vérification */
adminRouter.delete("/failures/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await getSupabaseAdmin()
      .from("failed_verifications")
      .delete()
      .eq("id", id);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true, message: "Enregistrement supprimé." });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/settings", async (_req, res, next) => {
  try {
    return res.json(await getValidationRules());
  } catch (error) {
    next(error);
  }
});

adminRouter.put("/settings", async (req, res, next) => {
  try {
    return res.json(await upsertValidationRules(req.body));
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/tp-catalog", async (_req, res, next) => {
  try {
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    const { data, error } = await getSupabaseAdmin()
      .from("tp_catalog")
      .select("code, title, filiere, montant, actif, created_at")
      .order("code");
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data ?? []);
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/tp-catalog", async (req, res, next) => {
  try {
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
      actif: actif === true || actif === "true" || actif === 1,
    };

    const sb = getSupabaseAdmin();
    const { error: upsertError } = await sb.from("tp_catalog").upsert(row, { onConflict: "code" });
    if (upsertError) return res.status(500).json({ error: upsertError.message });

    const { data, error } = await sb
      .from("tp_catalog")
      .select("code, title, filiere, montant, actif")
      .eq("code", codeNorm)
      .single();

    if (error || !data) return res.status(500).json({ error: error?.message ?? "TP introuvable après enregistrement." });

    invalidateTpCache();
    return res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/tp-catalog/:code", async (req, res, next) => {
  try {
    const code = decodeURIComponent(req.params.code).trim().toUpperCase();
    const { title, filiere, montant, actif } = req.body;
    const patch: Record<string, unknown> = {};
    if (title !== undefined) patch.title = String(title).trim();
    if (filiere !== undefined) patch.filiere = String(filiere).trim().toUpperCase();
    if (montant !== undefined) patch.montant = Number(montant);
    if (actif !== undefined) patch.actif = actif === true || actif === "true";

    if (!Object.keys(patch).length) {
      return res.status(400).json({ error: "Aucune modification fournie." });
    }

    const sb = getSupabaseAdmin();

    const { data: existing, error: readError } = await sb
      .from("tp_catalog")
      .select("code, title, filiere, montant, actif")
      .eq("code", code)
      .maybeSingle();

    if (readError) return res.status(500).json({ error: readError.message });
    if (!existing) return res.status(404).json({ error: `TP « ${code} » introuvable.` });

    const row = {
      code,
      title: (patch.title as string | undefined) ?? existing.title,
      filiere: (patch.filiere as string | undefined) ?? existing.filiere,
      montant: (patch.montant as number | undefined) ?? existing.montant,
      actif: patch.actif !== undefined ? (patch.actif as boolean) : existing.actif,
    };

    const { data, error } = await sb
      .from("tp_catalog")
      .upsert(row, { onConflict: "code" })
      .select("code, title, filiere, montant, actif")
      .single();

    if (error) return res.status(500).json({ error: error.message });

    invalidateTpCache();
    return res.json(data);
  } catch (error) {
    next(error);
  }
});

/** Exportation respectant les filtres actifs (Filière, Code TP, Recherche) */
adminRouter.get("/export/:format", async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const filiere = String(req.query.filiere ?? "").trim().toUpperCase();
    const codeTp = String(req.query.codeTp ?? "").trim().toUpperCase();

    let query = getSupabaseAdmin()
      .from("validated_students")
      .select("*")
      .order("date_verification", { ascending: false });

    if (filiere) query = query.eq("filiere", filiere);
    if (codeTp) query = query.eq("code_tp", codeTp);

    if (q) {
      query = query.or(
        `nom.ilike.%${q}%,prenom.ilike.%${q}%,matricule.ilike.%${q}%,filiere.ilike.%${q}%,numero_quittance.ilike.%${q}%,validation_id.ilike.%${q}%`
      );
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    const students = (data ?? []) as StudentRow[];
    const format = req.params.format;

    const filterSuffix = [filiere, codeTp].filter(Boolean).join("-") || "tous";
    const filenameBase = `etudiants-valides-${filterSuffix}`;

    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filenameBase}.csv"`);
      return res.send(exportStudentsToCsv(students));
    }
    if (format === "xlsx") {
      const buffer = await exportStudentsToExcel(students);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filenameBase}.xlsx"`);
      return res.send(buffer);
    }
    if (format === "pdf") {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filenameBase}.txt"`);
      return res.send(exportStudentsToPdf(students));
    }
    return res.status(400).json({ error: "Format : csv, xlsx ou pdf." });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/health", (_req, res) => {
  res.json({ supabase: isSupabaseConfigured() });
});

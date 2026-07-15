import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../utils/settings.js";
import { requireAdmin } from "../../middleware/auth.js";
import { getValidationRules, upsertValidationRules } from "../../utils/settings.js";
import {
  exportStudentsToCsv,
  exportStudentsToExcel,
  exportStudentsToPdf,
} from "../../services/export.service.js";

export const adminRouter = Router();

adminRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis." });
  }

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    return res.status(401).json({ error: "Identifiants incorrects." });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) return res.status(500).json({ error: "Configuration JWT manquante." });

  const token = jwt.sign(
    { adminId: admin.id, email: admin.email, role: admin.role },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? "8h" }
  );

  return res.json({
    token,
    admin: { id: admin.id, nom: admin.nom, email: admin.email, role: admin.role },
  });
});

adminRouter.use(requireAdmin);

adminRouter.get("/me", async (req, res) => {
  const { adminId } = (req as typeof req & { admin: { adminId: string } }).admin;
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { id: true, nom: true, email: true, role: true },
  });
  return res.json(admin);
});

adminRouter.get("/stats", async (_req, res) => {
  const [validated, failed, byFiliere] = await Promise.all([
    prisma.validatedStudent.count(),
    prisma.failedVerification.count(),
    prisma.validatedStudent.groupBy({
      by: ["filiere"],
      _count: { filiere: true },
    }),
  ]);

  const total = validated + failed;
  return res.json({
    validated,
    failed,
    total,
    validationRate: total > 0 ? Math.round((validated / total) * 100) : 0,
    byFiliere: byFiliere.map((f) => ({ filiere: f.filiere, count: f._count.filiere })),
  });
});

adminRouter.get("/students", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const students = await prisma.validatedStudent.findMany({
    where: q
      ? {
          OR: [
            { nom: { contains: q, mode: "insensitive" } },
            { prenom: { contains: q, mode: "insensitive" } },
            { numeroQuittance: { contains: q, mode: "insensitive" } },
            { filiere: { contains: q, mode: "insensitive" } },
            { validationId: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { dateVerification: "desc" },
  });
  return res.json(students);
});

adminRouter.get("/failures", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const failures = await prisma.failedVerification.findMany({
    where: q
      ? {
          OR: [
            { nom: { contains: q, mode: "insensitive" } },
            { prenom: { contains: q, mode: "insensitive" } },
            { motif: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return res.json(failures);
});

adminRouter.get("/settings", async (_req, res) => {
  return res.json(await getValidationRules());
});

adminRouter.put("/settings", async (req, res) => {
  const rules = await upsertValidationRules(req.body);
  return res.json(rules);
});

adminRouter.get("/export/:format", async (req, res) => {
  const students = await prisma.validatedStudent.findMany({ orderBy: { dateVerification: "desc" } });
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
    const content = exportStudentsToPdf(students);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="etudiants-valides.pdf"');
    return res.send(Buffer.from(content));
  }

  return res.status(400).json({ error: "Format non supporté. Utilisez csv, xlsx ou pdf." });
});

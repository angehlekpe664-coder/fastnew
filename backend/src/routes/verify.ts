import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../utils/settings.js";
import { getValidationRules } from "../utils/settings.js";
import { verifyReceipt } from "../services/verification.service.js";

const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Format non supporté. Utilisez PDF, JPG ou PNG."));
  },
});

export const verifyRouter = Router();

verifyRouter.post("/", upload.single("quittance"), async (req, res) => {
  try {
    const { nom, prenom, faculte, departement, filiere, niveau, matiere } = req.body;

    if (!nom || !prenom || !faculte || !departement || !filiere || !niveau) {
      return res.status(400).json({ error: "Tous les champs obligatoires doivent être remplis." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "La quittance (PDF ou image) est obligatoire." });
    }

    const rules = await getValidationRules();
    const result = await verifyReceipt(
      {
        nom,
        prenom,
        faculte,
        departement,
        filiere,
        niveau,
        matiere,
        filePath: req.file.path,
        mimeType: req.file.mimetype,
      },
      rules
    );

    if (!result.success) {
      await prisma.failedVerification.create({
        data: {
          nom,
          prenom,
          faculte,
          departement,
          filiere,
          niveau,
          motif: result.motif,
          fichier: req.file.filename,
          metadata: result.extracted ? { extracted: result.extracted } : undefined,
        },
      });

      return res.status(422).json({
        success: false,
        motif: result.motif,
      });
    }

    const existing = await prisma.validatedStudent.findFirst({
      where: {
        OR: [
          { numeroQuittance: result.extracted.quittanceNumber },
          { referencePaiement: result.extracted.referencePaiement || undefined },
        ],
      },
    });

    if (existing) {
      await prisma.failedVerification.create({
        data: {
          nom,
          prenom,
          faculte,
          departement,
          filiere,
          niveau,
          motif: "Quittance déjà utilisée pour une validation précédente.",
          fichier: req.file.filename,
        },
      });
      return res.status(409).json({
        success: false,
        motif: "Cette quittance a déjà été enregistrée.",
      });
    }

    const datePaiement = result.extracted.datePaiement
      ? new Date(result.extracted.datePaiement.split("/").reverse().join("-"))
      : null;

    const student = await prisma.validatedStudent.create({
      data: {
        nom,
        prenom,
        faculte,
        departement,
        filiere,
        niveau,
        matiere: matiere || null,
        numeroQuittance: result.extracted.quittanceNumber,
        referencePaiement: result.extracted.referencePaiement || null,
        montant: result.extracted.amount,
        datePaiement: datePaiement && !Number.isNaN(datePaiement.getTime()) ? datePaiement : null,
        fichierQuittance: req.file.filename,
        validationId: result.validationId,
        confidence: result.confidence,
        metadata: { extracted: result.extracted, rulesVersion: rules.academicYear },
      },
    });

    return res.json({
      success: true,
      message: "Paiement vérifié avec succès.",
      validationId: student.validationId,
      student: {
        nom: student.nom,
        prenom: student.prenom,
        filiere: student.filiere,
        niveau: student.niveau,
        numeroQuittance: student.numeroQuittance,
        montant: student.montant,
        dateVerification: student.dateVerification,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Erreur interne du serveur.",
    });
  }
});

verifyRouter.get("/status/:validationId", async (req, res) => {
  const student = await prisma.validatedStudent.findUnique({
    where: { validationId: req.params.validationId },
    select: {
      validationId: true,
      nom: true,
      prenom: true,
      filiere: true,
      niveau: true,
      numeroQuittance: true,
      montant: true,
      dateVerification: true,
      statut: true,
    },
  });

  if (!student) return res.status(404).json({ error: "Identifiant de validation introuvable." });
  return res.json(student);
});

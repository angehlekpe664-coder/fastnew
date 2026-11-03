import { Router } from "express";
import multer from "multer";
import path from "path";
import rateLimit from "express-rate-limit";
import { getSupabaseAdmin, isSupabaseConfigured } from "../lib/supabase.js";
import { getValidationRules, verifyReceipt, uploadQuittance } from "../services/verification.service.js";
import { lookupTp, listActiveTp } from "../data/tp-catalog.js";
import { config } from "../config.js";
import { logger } from "../logger.js";

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: config.maxFileSize },
  fileFilter: (_req, file, cb) => {
    const mimeOk = config.allowedMimeTypes.includes(file.mimetype);
    const ext = path.extname(file.originalname).toLowerCase();
    const extOk = config.allowedExtensions.includes(ext);

    if (mimeOk && extOk) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Format de fichier non supporté. Seuls les fichiers PDF originaux émis par le Trésor Public sont acceptés (les images, photos et captures d'écran sont refusées)."
        )
      );
    }
  },
});

const verifySubmissionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de tentatives de vérification. Veuillez patienter 10 minutes avant de réesssayez." },
});

export const verifyRouter = Router();

const TP_HEADERS = { "Cache-Control": "no-cache, no-store, must-revalidate" };

function sanitizeInput(str: unknown, maxLen = 100): string {
  if (typeof str !== "string") return "";
  return str.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, maxLen);
}

verifyRouter.get("/tp", async (req, res, next) => {
  try {
    res.set(TP_HEADERS);
    const filiere = sanitizeInput(req.query.filiere, 20).toUpperCase();
    let list = await listActiveTp();
    if (filiere) list = list.filter((tp) => tp.filiere === filiere);
    return res.json(list);
  } catch (error) {
    next(error);
  }
});

verifyRouter.get("/tp/:code", async (req, res, next) => {
  try {
    res.set(TP_HEADERS);
    const code = sanitizeInput(decodeURIComponent(req.params.code), 30);
    const tp = await lookupTp(code);
    if (!tp) return res.status(404).json({ error: "Code TP inconnu." });
    return res.json(tp);
  } catch (error) {
    next(error);
  }
});

function persistFailureAsync(payload: {
  nom: string;
  prenom: string;
  matricule: string;
  filiere: string;
  codeTp: string;
  motif: string;
  buffer: Buffer;
  filename: string;
  mimeType: string;
  metadata: unknown;
}) {
  if (!isSupabaseConfigured()) return;

  void uploadQuittance(payload.buffer, payload.filename, payload.mimeType)
    .catch(() => `${Date.now()}-${payload.filename}`)
    .then((fichier) =>
      getSupabaseAdmin()
        .from("failed_verifications")
        .insert({
          nom: payload.nom,
          prenom: payload.prenom,
          matricule: payload.matricule,
          filiere: payload.filiere,
          code_tp: payload.codeTp,
          motif: payload.motif,
          fichier,
          metadata: payload.metadata,
        })
    )
    .catch((err) =>
      logger.error("Échec de l'enregistrement dans failed_verifications", {
        error: String(err),
      })
    );
}

verifyRouter.post(
  "/",
  verifySubmissionLimiter,
  (req, res, next) => {
    upload.single("quittance")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            error: "Fichier PDF trop volumineux. La taille maximale est de 10 Mo.",
          });
        }
        return res.status(400).json({
          error: `Erreur de téléversement : ${err.message}`,
        });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      const nom = sanitizeInput(req.body?.nom, 80);
      const prenom = sanitizeInput(req.body?.prenom, 80);
      const matricule = sanitizeInput(req.body?.matricule, 40).toUpperCase();
      const filiere = sanitizeInput(req.body?.filiere, 20).toUpperCase();
      const codeTp = sanitizeInput(req.body?.codeTp, 30).toUpperCase();

      if (!nom || !prenom || !matricule || !filiere || !codeTp) {
        return res.status(400).json({
          error: "Nom, prénom, matricule, filière et code TP sont obligatoires.",
        });
      }

      if (!req.file) {
        return res
          .status(400)
          .json({ error: "Veuillez joindre le fichier PDF original de votre quittance." });
      }

      const magicBytes = req.file.buffer.subarray(0, 5).toString("ascii");
      if (magicBytes !== "%PDF-") {
        logger.warn(`Fichier non-PDF déguisé reçu pour ${matricule}`);
        return res.status(400).json({
          error: "Le fichier soumis n'est pas un document PDF valide (en-tête binaire non conforme).",
        });
      }

      const [tp, rules] = await Promise.all([
        lookupTp(codeTp),
        getValidationRules(),
      ]);

      if (!tp) {
        return res.status(400).json({
          error: `Code TP « ${codeTp} » introuvable dans le catalogue.`,
        });
      }

      if (tp.filiere !== filiere && !filiere.startsWith(tp.filiere)) {
        return res.status(400).json({
          error: `Le TP ${codeTp} appartient à la filière ${tp.filiere}, pas ${filiere}.`,
        });
      }

      const body = { nom, prenom, matricule, filiere };

      logger.info(
        `Début de vérification pour ${body.matricule} (TP ${tp.code})`
      );

      const result = await verifyReceipt(
        {
          ...body,
          codeTp: tp.code,
          tpTitle: tp.title,
          expectedAmount: tp.montant,
          fileBuffer: req.file.buffer,
          mimeType: req.file.mimetype,
        },
        rules
      );

      if (!result.success) {
        logger.warn(
          `Échec vérification pour ${body.matricule}: ${result.motif}`
        );
        persistFailureAsync({
          ...body,
          codeTp: tp.code,
          motif: result.motif,
          buffer: req.file.buffer,
          filename: req.file.originalname,
          mimeType: req.file.mimetype,
          metadata: result.extracted
            ? {
                extracted: result.extracted,
                methods: result.extracted.method,
                integrity: result.extracted.integrity,
              }
            : null,
        });
        return res.status(422).json({ success: false, motif: result.motif });
      }

      if (!isSupabaseConfigured()) {
        logger.warn(
          "Supabase non configuré — la vérification a réussi mais la persistance est ignorée."
        );
        return res.json({
          success: true,
          validationId: result.validationId,
          attestation: {
            ...body,
            codeTp: tp.code,
            tpTitle: tp.title,
            montant: result.extracted.amount,
          },
          warning: "Supabase non configuré — enregistrement non persisté.",
        });
      }

      const quittanceKey =
        result.extracted.quittanceNumber || result.validationId;

      const [storagePath, existingResult] = await Promise.all([
        uploadQuittance(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        ).catch(() => `${Date.now()}-${req.file!.originalname}`),
        getSupabaseAdmin()
          .from("validated_students")
          .select("id")
          .eq("numero_quittance", quittanceKey)
          .maybeSingle(),
      ]);

      if (existingResult.data) {
        logger.warn(
          `Quittance déjà utilisée (${quittanceKey}) par ${body.matricule}`
        );
        persistFailureAsync({
          ...body,
          codeTp: tp.code,
          motif: "Quittance déjà enregistrée.",
          buffer: req.file.buffer,
          filename: req.file.originalname,
          mimeType: req.file.mimetype,
          metadata: null,
        });
        return res
          .status(409)
          .json({ success: false, motif: "Cette quittance a déjà été utilisée." });
      }

      const datePaiement = result.extracted.datePaiement
        ? parseFlexibleDate(result.extracted.datePaiement)
        : null;

      const { data: student, error } = await getSupabaseAdmin()
        .from("validated_students")
        .insert({
          nom: body.nom,
          prenom: body.prenom,
          matricule: body.matricule,
          filiere: body.filiere,
          code_tp: tp.code,
          tp_title: tp.title,
          numero_quittance: quittanceKey,
          reference_paiement: result.extracted.referencePaiement || null,
          montant: result.extracted.amount,
          date_paiement: datePaiement,
          fichier_quittance: storagePath,
          validation_id: result.validationId,
          confidence: result.confidence,
          metadata: {
            extracted: result.extracted,
            parseMethods: result.extracted.method,
            integrity: result.extracted.integrity,
          },
        })
        .select()
        .single();

      if (error) {
        logger.error(
          "Erreur d'insertion dans validated_students",
          { error: error.message }
        );
        throw new Error(error.message);
      }

      logger.info(
        `Succès de la validation pour ${body.matricule} (ValidationID: ${student.validation_id})`
      );

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
    } catch (error) {
      next(error);
    }
  }
);

verifyRouter.get("/status/:validationId", async (req, res, next) => {
  try {
    if (!isSupabaseConfigured()) {
      return res
        .status(503)
        .json({ error: "Supabase requis pour la consultation." });
    }

    res.set("Cache-Control", "private, max-age=30");
    const valId = sanitizeInput(req.params.validationId, 50);

    const { data } = await getSupabaseAdmin()
      .from("validated_students")
      .select(
        "validation_id, nom, prenom, matricule, filiere, code_tp, tp_title, numero_quittance, montant, date_verification, statut"
      )
      .eq("validation_id", valId)
      .maybeSingle();

    if (!data) return res.status(404).json({ error: "Identifiant introuvable." });
    return res.json(data);
  } catch (error) {
    next(error);
  }
});

function parseFlexibleDate(value: string): string | null {
  const fr = value.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (!fr) return null;
  const year = fr[3].length === 2 ? `20${fr[3]}` : fr[3];
  return `${year}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}`;
}

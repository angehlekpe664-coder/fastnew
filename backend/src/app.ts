import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { verifyRouter } from "./routes/verify.js";
import { adminRouter } from "./routes/admin/index.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";

function isAllowedOrigin(origin: string): boolean {
  if (config.corsOrigins.includes(origin)) return true;
  if (config.isProduction() && /\.onrender\.com$/i.test(new URL(origin).host)) {
    return true;
  }
  return false;
}

export function createApp() {
  const app = express();

  // En-têtes de sécurité HTTP
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  // Rate Limiting anti-abus (200 requêtes / 15 min par IP)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Trop de requêtes, veuillez réessayer plus tard." },
  });
  app.use(limiter);

  // Configuration CORS centralisée
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || isAllowedOrigin(origin)) cb(null, true);
        else cb(new Error("CORS non autorisé"));
      },
      credentials: true,
    })
  );

  // Body Parsing avec limitation stricte
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true, limit: "2mb" }));

  // Service statique sécurisé pour le dossier d'uploads
  app.use(
    "/uploads",
    express.static(config.uploadDir, {
      dotfiles: "ignore",
      index: false,
      maxAge: "1d",
    })
  );

  // Vérification de l'état de l'API
  app.get("/api/health", (_req, res) => {
    const hasUrl = Boolean(config.supabase.url);
    const hasAnon = Boolean(config.supabase.anonKey);
    const hasServiceRole = Boolean(config.supabase.serviceRoleKey);
    res.json({
      status: "ok",
      service: "UniPay Verify API",
      env: config.nodeEnv,
      supabase: {
        url: hasUrl,
        anonKey: hasAnon,
        serviceRole: hasServiceRole,
        ready: hasUrl && hasAnon && hasServiceRole,
      },
      pdfEngine: "pdf-parse + jsQR + regex (100% gratuit)",
    });
  });

  // Enregistrement des routes
  app.use("/api/verify", verifyRouter);
  app.use("/api/admin", adminRouter);

  // Gestion centralisée des routes 404 et des erreurs
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

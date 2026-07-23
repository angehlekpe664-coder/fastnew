import express from "express";
import cors from "cors";
import path from "path";
import { verifyRouter } from "./routes/verify.js";
import { adminRouter } from "./routes/admin/index.js";

const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173,http://localhost:5174")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins.includes(origin)) return true;
  if (process.env.NODE_ENV === "production" && /\.onrender\.com$/i.test(new URL(origin).host)) {
    return true;
  }
  return false;
}

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || isAllowedOrigin(origin)) cb(null, true);
        else cb(new Error("CORS non autorisé"));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use("/uploads", express.static(path.resolve(process.env.UPLOAD_DIR ?? "./uploads")));

  app.get("/api/health", (_req, res) => {
    const hasUrl = Boolean(process.env.SUPABASE_URL);
    const hasAnon = Boolean(process.env.SUPABASE_ANON_KEY);
    const hasServiceRole = Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
    );
    res.json({
      status: "ok",
      service: "UniPay Verify API",
      supabase: {
        url: hasUrl,
        anonKey: hasAnon,
        serviceRole: hasServiceRole,
        ready: hasUrl && hasAnon && hasServiceRole,
      },
      pdfEngine: "pdf-parse + jsQR + regex (100% gratuit)",
    });
  });

  app.use("/api/verify", verifyRouter);
  app.use("/api/admin", adminRouter);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: err.message || "Erreur serveur." });
  });

  return app;
}

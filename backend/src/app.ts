import express from "express";
import cors from "cors";
import path from "path";
import { verifyRouter } from "./routes/verify.js";
import { adminRouter } from "./routes/admin/index.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use("/uploads", express.static(path.resolve(process.env.UPLOAD_DIR ?? "./uploads")));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "UniPay Verify API" });
  });

  app.use("/api/verify", verifyRouter);
  app.use("/api/admin", adminRouter);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: err.message || "Erreur serveur." });
  });

  return app;
}

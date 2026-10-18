import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: () => (process.env.NODE_ENV ?? "development") === "production",

  uploadDir: path.resolve(process.env.UPLOAD_DIR ?? "./uploads"),

  corsOrigins: (
    process.env.CORS_ORIGIN ??
    process.env.CORS_ORIGINS ??
    "http://localhost:5173,http://localhost:5174"
  )
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),

  supabase: {
    url: process.env.SUPABASE_URL ?? "",
    anonKey: process.env.SUPABASE_ANON_KEY ?? "",
    serviceRoleKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.SUPABASE_SECRET_KEY ??
      "",
  },

  warmupOcr: process.env.WARMUP_OCR !== "false",

  maxFileSize: 10 * 1024 * 1024, // 10 Mo max
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ],
  allowedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".pdf"],
};

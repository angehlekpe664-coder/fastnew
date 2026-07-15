import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type AuthPayload = { adminId: string; email: string; role: string };

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentification requise." });
  }

  const token = header.slice(7);
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET manquant");
    const payload = jwt.verify(token, secret) as AuthPayload;
    (req as Request & { admin: AuthPayload }).admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Token invalide ou expiré." });
  }
}

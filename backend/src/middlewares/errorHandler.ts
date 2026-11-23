import { Request, Response, NextFunction } from "express";
import { logger } from "../logger.js";
import { config } from "../config.js";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    error: "Route non trouvée.",
    status: 404,
  });
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error(err.message, { stack: err.stack });

  const statusCode = (err as any).status || (err as any).statusCode || 500;

  res.status(statusCode).json({
    error: err.message || "Erreur serveur.",
    status: statusCode,
  });
}

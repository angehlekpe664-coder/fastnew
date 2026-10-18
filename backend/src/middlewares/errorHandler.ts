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
  logger.error(err.message, { stack: config.isProduction() ? undefined : err.stack });

  const statusCode = (err as any).status || (err as any).statusCode || 500;

  res.status(statusCode).json({
    error: config.isProduction() && statusCode === 500 ? "Erreur interne du serveur." : err.message || "Erreur serveur.",
    status: statusCode,
  });
}

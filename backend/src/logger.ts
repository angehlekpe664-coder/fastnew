import { config } from "./config.js";

type LogLevel = "debug" | "info" | "warn" | "error";

function formatLog(level: LogLevel, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const metaString = meta ? ` | Meta: ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}]: ${message}${metaString}`;
}

export const logger = {
  debug: (message: string, meta?: unknown) => {
    if (!config.isProduction()) {
      console.debug(formatLog("debug", message, meta));
    }
  },
  info: (message: string, meta?: unknown) => {
    console.info(formatLog("info", message, meta));
  },
  warn: (message: string, meta?: unknown) => {
    console.warn(formatLog("warn", message, meta));
  },
  error: (message: string, meta?: unknown) => {
    console.error(formatLog("error", message, meta));
  },
};

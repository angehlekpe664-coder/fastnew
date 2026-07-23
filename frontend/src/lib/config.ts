const PRODUCTION_API = "https://fastnew-api.onrender.com";

/** URL API : proxy Vite en dev, Render en production. */
export function getApiUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (import.meta.env.PROD) return PRODUCTION_API;
  return "";
}

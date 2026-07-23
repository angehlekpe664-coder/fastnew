import { getApiUrl } from "./config";

const API = getApiUrl();

let tokenCache: { token: string; expires: number } | null = null;

export function clearTokenCache() {
  tokenCache = null;
}

export function syncTokenFromSession(session: { access_token: string; expires_at?: number }) {
  tokenCache = {
    token: session.access_token,
    expires: (session.expires_at ?? 0) * 1000 - 60_000,
  };
}

/** Token frais — rafraîchit silencieusement si proche de l'expiration. */
async function getAccessToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && tokenCache && tokenCache.expires > Date.now()) {
    return tokenCache.token;
  }

  const { supabase } = await import("./supabase");
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) throw new Error("Non connecté");

  const expiresAt = (session.expires_at ?? 0) * 1000;
  const shouldRefresh = forceRefresh || expiresAt - Date.now() < 90_000;

  if (shouldRefresh) {
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (error || !refreshed.session) {
      clearTokenCache();
      throw new Error("SESSION_EXPIRED");
    }
    syncTokenFromSession(refreshed.session);
    return refreshed.session.access_token;
  }

  syncTokenFromSession(session);
  return session.access_token;
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let json: { error?: string } | null = null;

  if (text) {
    try {
      json = JSON.parse(text) as { error?: string };
    } catch {
      throw new Error(
        res.status === 502 || res.status === 504
          ? "Backend indisponible. Réessayez dans quelques instants."
          : "Réponse serveur invalide."
      );
    }
  }

  if (!res.ok) {
    if (res.status === 401) throw new Error("SESSION_EXPIRED");
    if (res.status === 403) throw new Error(json?.error ?? "Accès refusé.");
    if (!text) {
      throw new Error(
        res.status === 502 || res.status === 504
          ? "Backend indisponible. Réessayez dans quelques instants."
          : `Erreur API (${res.status})`
      );
    }
    throw new Error(json?.error ?? `Erreur API (${res.status})`);
  }

  if (!text) throw new Error("Réponse vide du serveur.");
  return JSON.parse(text) as T;
}

export async function adminFetch<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  let token: string;
  try {
    token = await getAccessToken(retried);
  } catch (e) {
    if (e instanceof Error && e.message === "SESSION_EXPIRED") {
      throw new Error("Session expirée. Reconnectez-vous.");
    }
    throw e;
  }

  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new Error("Impossible de joindre l'API. Vérifiez votre connexion.");
  }

  if (res.status === 401 && !retried) {
    clearTokenCache();
    try {
      await getAccessToken(true);
      return adminFetch<T>(path, init, true);
    } catch {
      throw new Error("Session expirée. Reconnectez-vous.");
    }
  }

  return parseResponse<T>(res);
}

export async function downloadExport(format: "csv" | "xlsx" | "pdf") {
  const token = await getAccessToken();

  const res = await fetch(`${API}/api/admin/export/${format}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `export.${format === "xlsx" ? "xlsx" : format === "csv" ? "csv" : "txt"}`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Pré-charge le token au démarrage de l'app admin. */
export async function warmupAuth(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}

import { getApiUrl } from "./config";

export type VerifyPayload = {
  nom: string;
  prenom: string;
  matricule: string;
  filiere: string;
  codeTp: string;
  quittance: File;
};

export type TpInfo = { code: string; title: string; filiere: string; montant: number };

export type VerifySuccess = {
  success: true;
  message: string;
  validationId: string;
  attestation: {
    nom: string;
    prenom: string;
    matricule: string;
    filiere: string;
    codeTp: string;
    tpTitle: string;
    numeroQuittance?: string;
    montant: number;
    dateVerification?: string;
  };
};

export type VerifyFailure = { success: false; motif: string };

const API = getApiUrl();
const tpCache = new Map<string, { data: TpInfo | null; expires: number }>();
const listCaches = new Map<string, { data: TpInfo[]; expires: number }>();

const TP_CACHE_MS = 15_000;

async function fetchWithRetry(url: string, init?: RequestInit, retries = 2, delay = 2000): Promise<Response> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);
    const res = await fetch(url, { ...init, signal: controller.signal });
    clearTimeout(timeoutId);
    return res;
  } catch {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, delay));
      return fetchWithRetry(url, init, retries - 1, delay * 1.5);
    }
    throw new Error(
      "Impossible de joindre le serveur. Le serveur Render est en cours de réveil (démarrage à froid), veuillez patienter 30 secondes et réessayer."
    );
  }
}

export async function fetchActiveTps(filiere?: string, force = false): Promise<TpInfo[]> {
  const cacheKey = filiere?.toUpperCase() ?? "__all__";
  if (!force) {
    const hit = listCaches.get(cacheKey);
    if (hit && hit.expires > Date.now()) return hit.data;
  }

  const params = filiere ? `?filiere=${encodeURIComponent(filiere)}&_=${Date.now()}` : `?_=${Date.now()}`;
  try {
    const res = await fetchWithRetry(`${API}/api/verify/tp${params}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as TpInfo[];
    listCaches.set(cacheKey, { data, expires: Date.now() + TP_CACHE_MS });
    return data;
  } catch {
    return [];
  }
}

export function clearTpListCache() {
  listCaches.clear();
  tpCache.clear();
}

export async function fetchTp(code: string): Promise<TpInfo | null> {
  const key = code.trim().toUpperCase();
  const hit = tpCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data;

  try {
    const res = await fetchWithRetry(`${API}/api/verify/tp/${encodeURIComponent(key)}`, { cache: "no-store" });
    const data = res.ok ? ((await res.json()) as TpInfo) : null;
    tpCache.set(key, { data, expires: Date.now() + TP_CACHE_MS });
    return data;
  } catch {
    return null;
  }
}

export async function verifyQuittance(data: VerifyPayload): Promise<VerifySuccess | VerifyFailure> {
  const form = new FormData();
  form.append("nom", data.nom);
  form.append("prenom", data.prenom);
  form.append("matricule", data.matricule);
  form.append("filiere", data.filiere);
  form.append("codeTp", data.codeTp);
  form.append("quittance", data.quittance);

  const res = await fetchWithRetry(`${API}/api/verify`, { method: "POST", body: form }, 1, 3000);
  const json = await res.json();
  if (!res.ok) return { success: false, motif: json.motif || json.error || "Erreur de vérification." };
  return json;
}

export async function lookupValidation(id: string) {
  const res = await fetchWithRetry(`${API}/api/verify/status/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("Identifiant introuvable");
  return res.json();
}

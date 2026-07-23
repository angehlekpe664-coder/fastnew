import { createCache } from "../lib/cache.js";

/** Catalogue TP local (fallback si Supabase indisponible) */
export const TP_CATALOG: Record<
  string,
  { title: string; filiere: string; montant: number; actif: boolean }
> = {
  PHY1322: { title: "Mécanique Expérimental", filiere: "MIA", montant: 1000, actif: true },
};

export type TpEntry = {
  code: string;
  title: string;
  filiere: string;
  montant: number;
  actif?: boolean;
};

const TTL = 60_000;
const tpByCode = new Map<string, { value: TpEntry | null; expires: number }>();
const listCache = createCache<TpEntry[]>(TTL);

export function invalidateTpCache(code?: string) {
  if (code) tpByCode.delete(code.toUpperCase());
  else tpByCode.clear();
  listCache.clear();
}

function getTpCached(code: string): TpEntry | null | undefined {
  const hit = tpByCode.get(code);
  if (!hit || hit.expires < Date.now()) return undefined;
  return hit.value;
}

function setTpCached(code: string, value: TpEntry | null) {
  tpByCode.set(code, { value, expires: Date.now() + TTL });
}

export async function lookupTp(code: string): Promise<TpEntry | null> {
  const normalized = code.trim().toUpperCase();
  const cached = getTpCached(normalized);
  if (cached !== undefined) return cached;

  const { getSupabaseAdmin, isSupabaseConfigured } = await import("../lib/supabase.js");

  if (isSupabaseConfigured()) {
    const { data } = await getSupabaseAdmin()
      .from("tp_catalog")
      .select("code, title, filiere, montant, actif")
      .eq("code", normalized)
      .eq("actif", true)
      .maybeSingle();
    if (data) {
      setTpCached(normalized, data);
      return data;
    }
  }

  const local = TP_CATALOG[normalized];
  if (!local?.actif) {
    setTpCached(normalized, null);
    return null;
  }
  const entry = { code: normalized, ...local };
  setTpCached(normalized, entry);
  return entry;
}

export async function listActiveTp(): Promise<TpEntry[]> {
  const cached = listCache.get();
  if (cached) return cached;

  const { getSupabaseAdmin, isSupabaseConfigured } = await import("../lib/supabase.js");

  if (isSupabaseConfigured()) {
    const { data } = await getSupabaseAdmin()
      .from("tp_catalog")
      .select("code, title, filiere, montant, actif")
      .eq("actif", true)
      .order("code");
    if (data?.length) {
      listCache.set(data);
      return data;
    }
  }

  const list = Object.entries(TP_CATALOG)
    .filter(([, v]) => v.actif)
    .map(([code, v]) => ({ code, ...v }));
  listCache.set(list);
  return list;
}

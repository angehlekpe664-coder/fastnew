import { createCache } from "../lib/cache.js";
/** Fallback local uniquement si Supabase est indisponible */
export const TP_CATALOG = {
    PHY1322: { title: "Mécanique Expérimental", filiere: "MIA", montant: 1000, actif: true },
};
const TTL = 30_000;
const tpByCode = new Map();
const listCache = createCache(TTL);
/** Invalide tout le cache TP (liste + lookups). */
export function invalidateTpCache() {
    tpByCode.clear();
    listCache.clear();
}
function getTpCached(code) {
    const hit = tpByCode.get(code);
    if (!hit || hit.expires < Date.now())
        return undefined;
    return hit.value;
}
function setTpCached(code, value) {
    tpByCode.set(code, { value, expires: Date.now() + TTL });
}
export async function lookupTp(code) {
    const normalized = code.trim().toUpperCase();
    const cached = getTpCached(normalized);
    if (cached !== undefined)
        return cached;
    const { getSupabaseAdmin, isSupabaseConfigured } = await import("../lib/supabase.js");
    if (isSupabaseConfigured()) {
        const { data, error } = await getSupabaseAdmin()
            .from("tp_catalog")
            .select("code, title, filiere, montant, actif")
            .eq("code", normalized)
            .maybeSingle();
        if (!error) {
            if (!data || !data.actif) {
                setTpCached(normalized, null);
                return null;
            }
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
export async function listActiveTp() {
    const cached = listCache.get();
    if (cached)
        return cached;
    const { getSupabaseAdmin, isSupabaseConfigured } = await import("../lib/supabase.js");
    if (isSupabaseConfigured()) {
        const { data, error } = await getSupabaseAdmin()
            .from("tp_catalog")
            .select("code, title, filiere, montant, actif")
            .eq("actif", true)
            .order("code");
        if (!error) {
            const list = (data ?? []).filter((row) => row.actif !== false);
            listCache.set(list);
            return list;
        }
    }
    const list = Object.entries(TP_CATALOG)
        .filter(([, v]) => v.actif)
        .map(([code, v]) => ({ code, ...v }));
    listCache.set(list);
    return list;
}

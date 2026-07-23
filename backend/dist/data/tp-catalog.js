import { createCache } from "../lib/cache.js";
/** Catalogue TP local (fallback si Supabase indisponible) */
export const TP_CATALOG = {
    PHY1322: { title: "Mécanique Expérimental", filiere: "MIA", montant: 1000, actif: true },
};
const TTL = 60_000;
const tpByCode = new Map();
const listCache = createCache(TTL);
export function invalidateTpCache(code) {
    if (code)
        tpByCode.delete(code.toUpperCase());
    else
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
export async function listActiveTp() {
    const cached = listCache.get();
    if (cached)
        return cached;
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

/** Catalogue TP local (fallback si Supabase indisponible) */
export const TP_CATALOG = {
    PHY1121: { title: "Physique Expérimental", filiere: "MIA", montant: 2500 },
    PHY1322: { title: "Mécanique Expérimental", filiere: "MIA", montant: 2500 },
    INF1422: { title: "LaTeX", filiere: "MIA", montant: 1500 },
    INF1421: { title: "Python & Scilab", filiere: "MIA", montant: 1500 },
    "PHY1225-1": { title: "Mécanique et Électricité", filiere: "PC", montant: 2500 },
    "PHY1225-2": { title: "Optique", filiere: "PC", montant: 2500 },
    "CHM1226-1": { title: "Chimie Générale", filiere: "PC", montant: 2500 },
    "CHM1226-2": { title: "Chimie Minérale", filiere: "PC", montant: 2500 },
    "CHM1226-3": { title: "Chimie Organique", filiere: "PC", montant: 2500 },
    INF1120: { title: "Informatique", filiere: "PC", montant: 1500 },
    CHM1321: { title: "Chimie Organique Descriptif", filiere: "PC", montant: 2500 },
    CHM1323: { title: "Chimie des Matériaux", filiere: "PC", montant: 2500 },
    CHM1325: { title: "Chimie des Solutions", filiere: "PC", montant: 2500 },
    "PHY1426-2": { title: "Électronique", filiere: "PC", montant: 3000 },
    "PHY1426-3": { title: "Thermodynamique", filiere: "PC", montant: 3000 },
};
export async function lookupTp(code) {
    const normalized = code.trim().toUpperCase();
    const { getSupabaseAdmin, isSupabaseConfigured } = await import("../lib/supabase.js");
    if (isSupabaseConfigured()) {
        const { data } = await getSupabaseAdmin()
            .from("tp_catalog")
            .select("code, title, filiere, montant")
            .eq("code", normalized)
            .eq("actif", true)
            .maybeSingle();
        if (data)
            return data;
    }
    const local = TP_CATALOG[normalized];
    if (!local)
        return null;
    return { code: normalized, ...local };
}

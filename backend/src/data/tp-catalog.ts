import { createCache } from "../lib/cache.js";

export type TpEntry = {
  code: string;
  title: string;
  filiere: string;
  montant: number;
  actif?: boolean;
};

/** Catalogue officiel des 66 TP de la Faculté des Sciences (UAC) - Harmonisé à 1000 FCFA */
export const TP_CATALOG: Record<
  string,
  { title: string; filiere: string; montant: number; actif: boolean }
> = {
  "1PHY1222": { title: "TP Mécanique-Electricité", filiere: "MIA", montant: 1000, actif: true },
  "2PHY1222": { title: "TP Optique", filiere: "MIA", montant: 1000, actif: true },
  "PHY1322": { title: "TP Physique", filiere: "MIA", montant: 1000, actif: true },
  "INF1421": { title: "TP Python et Scilab", filiere: "MIA", montant: 1000, actif: true },
  "INF1422": { title: "TP Latex", filiere: "MIA", montant: 1000, actif: true },
  "INF1120": { title: "TP Initiation à l’analyse de Données", filiere: "PC", montant: 1000, actif: true },
  "1PHY1225-1": { title: "TP Mécanique-Electricité", filiere: "PC", montant: 1000, actif: true },
  "2PHY1225-2": { title: "TP Optique", filiere: "PC", montant: 1000, actif: true },
  "1CHM1226": { title: "TP Chimie générale", filiere: "PC", montant: 1000, actif: true },
  "2CHM1226": { title: "TP Chimie minérale", filiere: "PC", montant: 1000, actif: true },
  "3CHM1226": { title: "TP Chimie organique", filiere: "PC", montant: 1000, actif: true },
  "CHM1321": { title: "TP Chimie organique", filiere: "PC", montant: 1000, actif: true },
  "CHM1323": { title: "TP Chimie des Matériaux Inorganiques", filiere: "PC", montant: 1000, actif: true },
  "CHM1325": { title: "TP Chimie des Solutions", filiere: "PC", montant: 1000, actif: true },
  "2PHY1426": { title: "TP Electronique", filiere: "PC", montant: 1000, actif: true },
  "3PHY1426": { title: "TP Physique (Thermodynamique-optique)", filiere: "PC", montant: 1000, actif: true },
  "CHM1520": { title: "TP Spectroscopie organique", filiere: "PC", montant: 1000, actif: true },
  "1CHM1521": { title: "TP Chimie analytique", filiere: "PC", montant: 1000, actif: true },
  "2CHM1521": { title: "TP Chromatographie", filiere: "PC", montant: 1000, actif: true },
  "1CHM1522": { title: "TP Radiocristallographie", filiere: "PC", montant: 1000, actif: true },
  "2CHM1522": { title: "TP Métallurgie et transitions de phases", filiere: "PC", montant: 1000, actif: true },
  "CHM1523": { title: "TP Synthèse organique", filiere: "PC", montant: 1000, actif: true },
  "CHM1524": { title: "TP Chimie des substances naturelles", filiere: "PC", montant: 1000, actif: true },
  "1CHM1525": { title: "TP Thermodynamique chimique", filiere: "PC", montant: 1000, actif: true },
  "2CHM1525": { title: "TP Electrochimie", filiere: "PC", montant: 1000, actif: true },
  "CHM1526": { title: "TP Chimie numérique", filiere: "PC", montant: 1000, actif: true },
  "SCT1121": { title: "TP Cartographie et minéralogie", filiere: "CBG", montant: 1000, actif: true },
  "1BIO1122": { title: "TP Microbiologie", filiere: "CBG", montant: 1000, actif: true },
  "1BIO1123": { title: "TP Botanique", filiere: "CBG", montant: 1000, actif: true },
  "BIO1124": { title: "TP Physiologie Végétale", filiere: "CBG", montant: 1000, actif: true },
  "1BIO1125": { title: "TP Biologie Cellulaire", filiere: "CBG", montant: 1000, actif: true },
  "2BIO1125": { title: "TP Introduction à la physiologie animale", filiere: "CBG", montant: 1000, actif: true },
  "1CHM1126": { title: "TP Chimie générale", filiere: "CBG", montant: 1000, actif: true },
  "2CHM1126": { title: "TP Chimie minérale", filiere: "CBG", montant: 1000, actif: true },
  "3CHM1126": { title: "TP Chimie des Solutions", filiere: "CBG", montant: 1000, actif: true },
  "CHM1221": { title: "TP Chimie Organique", filiere: "CBG", montant: 1000, actif: true },
  "1BIO1222": { title: "TP Biologie et Systématique des Unicellulaires (SBU)", filiere: "CBG", montant: 1000, actif: true },
  "2BIO1222-1": { title: "TP SBP Vertébré", filiere: "CBG", montant: 1000, actif: true },
  "2BIO1222-2": { title: "TP SBP Invertébré", filiere: "CBG", montant: 1000, actif: true },
  "BIO1223": { title: "TP Ecologie Animale", filiere: "CBG", montant: 1000, actif: true },
  "SCT1224": { title: "TP Paléontologie", filiere: "CBG", montant: 1000, actif: true },
  "BIO1225": { title: "TP Génétique", filiere: "CBG", montant: 1000, actif: true },
  "1PHY1226": { title: "TP Mécanique-Electricité", filiere: "CBG", montant: 1000, actif: true },
  "2PHY1226": { title: "TP Optique", filiere: "CBG", montant: 1000, actif: true },
  "BIO1321": { title: "TP Génétique", filiere: "CBG", montant: 1000, actif: true },
  "BIO1322": { title: "TP Écologie", filiere: "CBG", montant: 1000, actif: true },
  "BIO1323": { title: "TP BNV", filiere: "CBG", montant: 1000, actif: true },
  "SCT1324": { title: "TP Pétrologie", filiere: "CBG", montant: 1000, actif: true },
  "BIO1326": { title: "TP Biotechnologies", filiere: "CBG", montant: 1000, actif: true },
  "TCC1327": { title: "TP Instrumentation et Bonnes Pratiques de Laboratoire", filiere: "CBG", montant: 1000, actif: true },
  "BIO1421": { title: "TP Embryogenèse", filiere: "CBG", montant: 1000, actif: true },
  "BIO1422": { title: "TP Entomologie", filiere: "CBG", montant: 1000, actif: true },
  "SCT1423": { title: "TP Tectonique (Cartographie et coupes géologiques)", filiere: "CBG", montant: 1000, actif: true },
  "1BIO1424": { title: "TP Neurophysiologie (Cellule nerveuse)", filiere: "CBG", montant: 1000, actif: true },
  "2BIO1424": { title: "TP Pharmacologie (Myogramme)", filiere: "CBG", montant: 1000, actif: true },
  "BCH1425": { title: "TP Biochimie (Caractérisation chimique des glucides)", filiere: "CBG", montant: 1000, actif: true },
  "BIO1426": { title: "TP Phanérogames", filiere: "CBG", montant: 1000, actif: true },
  "BIO1521": { title: "TP Ecologie Végétale", filiere: "CBG", montant: 1000, actif: true },
  "1BIO1522": { title: "TP Biologie et Nutrition chez les Invertébrés", filiere: "CBG", montant: 1000, actif: true },
  "2BIO1522": { title: "TP Biologie et Nutrition chez les vertébrés", filiere: "CBG", montant: 1000, actif: true },
  "BIO1523": { title: "TP Génétique", filiere: "CBG", montant: 1000, actif: true },
  "1BIO1524": { title: "TP Etude de la contraction du muscle", filiere: "CBG", montant: 1000, actif: true },
  "2BIO1524": { title: "TP Etude de la variation de l’automatisme cardiaque", filiere: "CBG", montant: 1000, actif: true },
  "1BIO1525": { title: "TP Comportement Animal", filiere: "CBG", montant: 1000, actif: true },
  "2BIO1525": { title: "TP Système Nerveux et Organes des Sens", filiere: "CBG", montant: 1000, actif: true },
  "SCT1526": { title: "TP Géologie et Sortie pédagogique", filiere: "CBG", montant: 1000, actif: true },
};

const TTL = 30_000;
const tpByCode = new Map<string, { value: TpEntry | null; expires: number }>();
const listCache = createCache<TpEntry[]>(TTL);

export function invalidateTpCache() {
  tpByCode.clear();
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
    const { data, error } = await getSupabaseAdmin()
      .from("tp_catalog")
      .select("code, title, filiere, montant, actif")
      .eq("code", normalized)
      .maybeSingle();

    if (!error && data) {
      if (!data.actif) {
        setTpCached(normalized, null);
        return null;
      }
      const entry = { ...data, montant: 1000 };
      setTpCached(normalized, entry);
      return entry;
    }
  }

  const local = TP_CATALOG[normalized];
  if (!local?.actif) {
    setTpCached(normalized, null);
    return null;
  }
  const entry = { code: normalized, ...local, montant: 1000 };
  setTpCached(normalized, entry);
  return entry;
}

export async function listActiveTp(): Promise<TpEntry[]> {
  const cached = listCache.get();
  if (cached) return cached;

  const { getSupabaseAdmin, isSupabaseConfigured } = await import("../lib/supabase.js");

  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseAdmin()
      .from("tp_catalog")
      .select("code, title, filiere, montant, actif")
      .eq("actif", true)
      .order("code");

    if (!error && data && data.length > 0) {
      const list = data.filter((row) => row.actif !== false).map((row) => ({ ...row, montant: 1000 }));
      listCache.set(list);
      return list;
    }
  }

  const list = Object.entries(TP_CATALOG)
    .filter(([, v]) => v.actif)
    .map(([code, v]) => ({ code, ...v, montant: 1000 }));
  listCache.set(list);
  return list;
}
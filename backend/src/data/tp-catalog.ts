import { createCache } from "../lib/cache.js";

export type TpEntry = {
  code: string;
  title: string;
  filiere: string;
  montant: number;
  actif?: boolean;
};

/** Catalogue complet de tous les TP de la Faculté des Sciences (UAC) - Harmonisé à 1000 FCFA */
export const TP_CATALOG: Record<
  string,
  { title: string; filiere: string; montant: number; actif: boolean }
> = {
  "1BIO1122": { title: "BIO1122", filiere: "CBG", montant: 1000, actif: true },
  "1BIO1123": { title: "BIO1123", filiere: "CBG", montant: 1000, actif: true },
  "1BIO1125": { title: "BIO1125", filiere: "CBG", montant: 1000, actif: true },
  "1BIO1222": { title: "BIO1222", filiere: "CBG", montant: 1000, actif: true },
  "1BIO1424": { title: "BIO1424", filiere: "CBG", montant: 1000, actif: true },
  "1BIO1522": { title: "BIO1522", filiere: "CBG", montant: 1000, actif: true },
  "1BIO1524": { title: "BIO1524", filiere: "CBG", montant: 1000, actif: true },
  "1BIO1525": { title: "BIO1525", filiere: "CBG", montant: 1000, actif: true },
  "1CHM1126": { title: "CHM1126", filiere: "PC", montant: 1000, actif: true },
  "1CHM1226": { title: "CHM1226", filiere: "PC", montant: 1000, actif: true },
  "1CHM1521": { title: "CHM1521", filiere: "PC", montant: 1000, actif: true },
  "1CHM1522": { title: "CHM1522", filiere: "PC", montant: 1000, actif: true },
  "1CHM1525": { title: "CHM1525", filiere: "PC", montant: 1000, actif: true },
  "1PHY1222": { title: "PHY1222", filiere: "PC", montant: 1000, actif: true },
  "1PHY1225-1": { title: "Instrumentations et manipulation de Physique", filiere: "PC", montant: 1000, actif: true },
  "1PHY1226": { title: "PHY1226", filiere: "PC", montant: 1000, actif: true },
  "2BIO1125": { title: "Introduction à la physiologie animale", filiere: "CBG", montant: 1000, actif: true },
  "2BIO1222-1": { title: "Biologie et Systématique des Pluricellulaires", filiere: "CBG", montant: 1000, actif: true },
  "2BIO1222-2": { title: "TP SBP Invertébré", filiere: "CBG", montant: 1000, actif: true },
  "2BIO1424": { title: "Pharmacologie / PPI-2", filiere: "CBG", montant: 1000, actif: true },
  "2BIO1522": { title: "Biologie et Nutrition chez les Vertébrés BNA2", filiere: "CBG", montant: 1000, actif: true },
  "2BIO1524": { title: "Physiologie de Nutrition Animale/ PRN", filiere: "CBG", montant: 1000, actif: true },
  "2BIO1525": { title: "Système Nerveux et Organes des Sens / ESS3", filiere: "CBG", montant: 1000, actif: true },
  "2CHM1126": { title: "Chimie Minérale", filiere: "PC", montant: 1000, actif: true },
  "2CHM1226": { title: "Instrumentations et manipulation de chimie minérale", filiere: "PC", montant: 1000, actif: true },
  "2CHM1521": { title: "Méthode chromatographique", filiere: "PC", montant: 1000, actif: true },
  "2CHM1522": { title: "Métallurgie et transitions de phases", filiere: "PC", montant: 1000, actif: true },
  "2CHM1525": { title: "Electrochimie", filiere: "PC", montant: 1000, actif: true },
  "2PHY1222": { title: "TP Optique", filiere: "PC", montant: 1000, actif: true },
  "2PHY1225-2": { title: "TP Optique", filiere: "PC", montant: 1000, actif: true },
  "2PHY1226": { title: "TP Optique", filiere: "PC", montant: 1000, actif: true },
  "2PHY1426": { title: "Instrumentations et manipulation  d’Electronique", filiere: "PC", montant: 1000, actif: true },
  "3CHM1126": { title: "Chimie des Solutions", filiere: "PC", montant: 1000, actif: true },
  "3CHM1226": { title: "Instrumentations et manipulation de chimie organique", filiere: "PC", montant: 1000, actif: true },
  "3PHY1426": { title: "Instrumentations et manipulation  de Physique Générale", filiere: "PC", montant: 1000, actif: true },
  "BCH1425": { title: "Biochimie et Immunologie", filiere: "CBG", montant: 1000, actif: true },
  "BCH1425-1": { title: "BCH1425", filiere: "CBG", montant: 1000, actif: true },
  "BCH1425-2": { title: "Introduction à l'immunologie / PPI-3", filiere: "CBG", montant: 1000, actif: true },
  "BIO1122": { title: "Microbiologie Fondamentale", filiere: "CBG", montant: 1000, actif: true },
  "BIO1122-1": { title: "BIO1122", filiere: "CBG", montant: 1000, actif: true },
  "BIO1122-2": { title: "Physiologie des Microorganismes", filiere: "CBG", montant: 1000, actif: true },
  "BIO1123": { title: "Botanique Générale et Biologie des Plantes Inférieures", filiere: "CBG", montant: 1000, actif: true },
  "BIO1123-1": { title: "BIO1123", filiere: "CBG", montant: 1000, actif: true },
  "BIO1123-2": { title: "Biologie des Plantes Inférieures", filiere: "CBG", montant: 1000, actif: true },
  "BIO1124": { title: "Physiologie Végétale Générale", filiere: "CBG", montant: 1000, actif: true },
  "BIO1124-1": { title: "BIO1124", filiere: "CBG", montant: 1000, actif: true },
  "BIO1124-2": { title: "Alimentation en eau et nutrition minérale", filiere: "CBG", montant: 1000, actif: true },
  "BIO1125": { title: "Biologie Cellulaire et Physiologie", filiere: "CBG", montant: 1000, actif: true },
  "BIO1125-1": { title: "BIO1125", filiere: "CBG", montant: 1000, actif: true },
  "BIO1125-2": { title: "Introduction à la physiologie animale", filiere: "CBG", montant: 1000, actif: true },
  "BIO1222": { title: "Biologie et Systématique Animale", filiere: "CBG", montant: 1000, actif: true },
  "BIO1222-1": { title: "BIO1222", filiere: "CBG", montant: 1000, actif: true },
  "BIO1222-2": { title: "Biologie et Systématique des Pluricellulaires", filiere: "CBG", montant: 1000, actif: true },
  "BIO1223": { title: "Ecologie Animale", filiere: "CBG", montant: 1000, actif: true },
  "BIO1225": { title: "Génétique Moléculaire", filiere: "CBG", montant: 1000, actif: true },
  "BIO1225-1": { title: "BIO1225", filiere: "CBG", montant: 1000, actif: true },
  "BIO1225-2": { title: "Mutations Génétiques", filiere: "CBG", montant: 1000, actif: true },
  "BIO1321": { title: "Génétique Formelle", filiere: "CBG", montant: 1000, actif: true },
  "BIO1321-1": { title: "BIO1321", filiere: "CBG", montant: 1000, actif: true },
  "BIO1321-2": { title: "Hérédité non Chromosomique", filiere: "CBG", montant: 1000, actif: true },
  "BIO1322": { title: "Ecologie Microbienne et Applications", filiere: "CBG", montant: 1000, actif: true },
  "BIO1322-1": { title: "BIO1322", filiere: "CBG", montant: 1000, actif: true },
  "BIO1322-2": { title: "Production Microbienne et Applications", filiere: "CBG", montant: 1000, actif: true },
  "BIO1323": { title: "Biologie de Nutrition Végétale", filiere: "CBG", montant: 1000, actif: true },
  "BIO1323-1": { title: "BIO1323", filiere: "CBG", montant: 1000, actif: true },
  "BIO1323-2": { title: "Nutrition Azotée des Végétaux", filiere: "CBG", montant: 1000, actif: true },
  "BIO1326": { title: "Biotechnologies Générales", filiere: "CBG", montant: 1000, actif: true },
  "BIO1421": { title: "Embryogenèse et Développement Animal", filiere: "CBG", montant: 1000, actif: true },
  "BIO1421-1": { title: "BIO1421", filiere: "CBG", montant: 1000, actif: true },
  "BIO1421-2": { title: "Développement Post-Embryonnaire", filiere: "CBG", montant: 1000, actif: true },
  "BIO1422": { title: "Entomologie Générale", filiere: "CBG", montant: 1000, actif: true },
  "BIO1424": { title: "Physiologie et Pharmacologie", filiere: "CBG", montant: 1000, actif: true },
  "BIO1424-1": { title: "BIO1424", filiere: "CBG", montant: 1000, actif: true },
  "BIO1424-2": { title: "Pharmacologie / PPI-2", filiere: "CBG", montant: 1000, actif: true },
  "BIO1426": { title: "Phanérogames", filiere: "CBG", montant: 1000, actif: true },
  "BIO1521": { title: "Ecologie et Découverte des Végétaux", filiere: "CBG", montant: 1000, actif: true },
  "BIO1521-1": { title: "BIO1521", filiere: "CBG", montant: 1000, actif: true },
  "BIO1521-2": { title: "Découverte des Végétaux", filiere: "CBG", montant: 1000, actif: true },
  "BIO1522": { title: "Biologie de Nutrition Animale", filiere: "CBG", montant: 1000, actif: true },
  "BIO1522-1": { title: "BIO1522", filiere: "CBG", montant: 1000, actif: true },
  "BIO1522-2": { title: "Biologie et Nutrition chez les Vertébrés BNA2", filiere: "CBG", montant: 1000, actif: true },
  "BIO1523": { title: "Génie Génétique et Applications", filiere: "CBG", montant: 1000, actif: true },
  "BIO1524": { title: "Physiologie de la Reproduction et de la Nutrition", filiere: "CBG", montant: 1000, actif: true },
  "BIO1524-1": { title: "BIO1524", filiere: "CBG", montant: 1000, actif: true },
  "BIO1524-2": { title: "Physiologie de Nutrition Animale/ PRN", filiere: "CBG", montant: 1000, actif: true },
  "BIO1525": { title: "Vie de Relation chez les Animaux", filiere: "CBG", montant: 1000, actif: true },
  "BIO1525-1": { title: "BIO1525", filiere: "CBG", montant: 1000, actif: true },
  "BIO1525-2": { title: "Système Nerveux et Organes des Sens / ESS3", filiere: "CBG", montant: 1000, actif: true },
  "CHM1126": { title: "Chimie Générale pour les SVT", filiere: "PC", montant: 1000, actif: true },
  "CHM1126-1": { title: "CHM1126", filiere: "PC", montant: 1000, actif: true },
  "CHM1126-2": { title: "Chimie Minérale", filiere: "PC", montant: 1000, actif: true },
  "CHM1126-3": { title: "Chimie des Solutions", filiere: "PC", montant: 1000, actif: true },
  "CHM1221": { title: "Chimie Organique", filiere: "PC", montant: 1000, actif: true },
  "CHM1221-1": { title: "CHM1221", filiere: "PC", montant: 1000, actif: true },
  "CHM1221-2": { title: "Chimie Organique Descriptive", filiere: "PC", montant: 1000, actif: true },
  "CHM1226": { title: "Chimie Expérimentale", filiere: "PC", montant: 1000, actif: true },
  "CHM1226-1": { title: "CHM1226", filiere: "PC", montant: 1000, actif: true },
  "CHM1226-2": { title: "Instrumentations et manipulation de chimie minérale", filiere: "PC", montant: 1000, actif: true },
  "CHM1226-3": { title: "Instrumentations et manipulation de chimie organique", filiere: "PC", montant: 1000, actif: true },
  "CHM1321": { title: "Chimie Organique Descriptive", filiere: "PC", montant: 1000, actif: true },
  "CHM1321-1": { title: "CHM1321", filiere: "PC", montant: 1000, actif: true },
  "CHM1321-2": { title: "Etude des Fonctions Simples", filiere: "PC", montant: 1000, actif: true },
  "CHM1323": { title: "Chimie des Matériaux Inorganiques", filiere: "PC", montant: 1000, actif: true },
  "CHM1325": { title: "Chimie des Solutions", filiere: "PC", montant: 1000, actif: true },
  "CHM1520": { title: "Spectroscopie atomique, moléculaire et organique", filiere: "PC", montant: 1000, actif: true },
  "CHM1520-1": { title: "CHM1520", filiere: "PC", montant: 1000, actif: true },
  "CHM1521": { title: "Chimie analytique et méthode chromatographique", filiere: "PC", montant: 1000, actif: true },
  "CHM1521-1": { title: "CHM1521", filiere: "PC", montant: 1000, actif: true },
  "CHM1521-2": { title: "Méthode chromatographique", filiere: "PC", montant: 1000, actif: true },
  "CHM1522": { title: "Cristallochimie-radiocristallographie, théorie des groupes, métallurgie et transitions de phases", filiere: "PC", montant: 1000, actif: true },
  "CHM1522-1": { title: "CHM1522", filiere: "PC", montant: 1000, actif: true },
  "CHM1522-2": { title: "Spectroscopie organique", filiere: "PC", montant: 1000, actif: true },
  "CHM1523": { title: "Synthèse organique", filiere: "PC", montant: 1000, actif: true },
  "CHM1524": { title: "Chimie des substances naturelles", filiere: "PC", montant: 1000, actif: true },
  "CHM1525": { title: "Thermodynamique chimique et électrochimie", filiere: "PC", montant: 1000, actif: true },
  "CHM1525-1": { title: "CHM1525", filiere: "PC", montant: 1000, actif: true },
  "CHM1525-2": { title: "Electrochimie", filiere: "PC", montant: 1000, actif: true },
  "CHM1526": { title: "Introduction à la chimie quantique et chimie numérique", filiere: "PC", montant: 1000, actif: true },
  "ECV2116": { title: "BIO1521", filiere: "CBG", montant: 1000, actif: true },
  "GBM2116": { title: "BIO1523", filiere: "CBG", montant: 1000, actif: true },
  "INF1120": { title: "Outils informatiques et initiation à l’analyses de Données", filiere: "MIA", montant: 1000, actif: true },
  "INF1421": { title: "Langages Python et Scilab", filiere: "MIA", montant: 1000, actif: true },
  "INF1421-1": { title: "INF1421", filiere: "MIA", montant: 1000, actif: true },
  "INF1421-2": { title: "Langage Python", filiere: "MIA", montant: 1000, actif: true },
  "INF1422": { title: "Traitement de Texte Scientifique par LaTeX", filiere: "MIA", montant: 1000, actif: true },
  "PHY1222": { title: "Physique expérimentale", filiere: "PC", montant: 1000, actif: true },
  "PHY1225": { title: "Physique Expérimentale", filiere: "PC", montant: 1000, actif: true },
  "PHY1225-1": { title: "PHY1225", filiere: "PC", montant: 1000, actif: true },
  "PHY1225-2": { title: "Instrumentations et manipulation de Physique", filiere: "PC", montant: 1000, actif: true },
  "PHY1226": { title: "Physique pour les SVT", filiere: "PC", montant: 1000, actif: true },
  "PHY1322": { title: "Mécanique Expérimentale", filiere: "PC", montant: 1000, actif: true },
  "PHY1426": { title: "Manipulations et Programmation", filiere: "PC", montant: 1000, actif: true },
  "PHY1426-1": { title: "PHY1426", filiere: "PC", montant: 1000, actif: true },
  "PHY1426-2": { title: "Instrumentations et manipulation  d’Electronique", filiere: "PC", montant: 1000, actif: true },
  "PHY1426-3": { title: "Instrumentations et manipulation  de Physique Générale", filiere: "PC", montant: 1000, actif: true },
  "SCT1121": { title: "Géologie Générale", filiere: "CBG", montant: 1000, actif: true },
  "SCT1224": { title: "Paléontologie et Stratigraphie", filiere: "CBG", montant: 1000, actif: true },
  "SCT1224-1": { title: "SCT1224", filiere: "CBG", montant: 1000, actif: true },
  "SCT1224-2": { title: "Stratigraphie", filiere: "CBG", montant: 1000, actif: true },
  "SCT1324": { title: "Pétrologie", filiere: "CBG", montant: 1000, actif: true },
  "SCT1324-1": { title: "SCT1324", filiere: "CBG", montant: 1000, actif: true },
  "SCT1324-2": { title: "Pétrologie Magmatique et Métamorphique", filiere: "MIA", montant: 1000, actif: true },
  "SCT1423": { title: "Tectonique et Cartographie", filiere: "CBG", montant: 1000, actif: true },
  "SCT1423-1": { title: "SCT1423", filiere: "CBG", montant: 1000, actif: true },
  "SCT1423-2": { title: "Tectonique Globale", filiere: "CBG", montant: 1000, actif: true },
  "SCT1526": { title: "Géologie Appliquée", filiere: "CBG", montant: 1000, actif: true },
  "SCT1526-1": { title: "SCT1526", filiere: "CBG", montant: 1000, actif: true },
  "SCT1526-2": { title: "Géoressources et Environnement", filiere: "CBG", montant: 1000, actif: true },
  "TCC1327": { title: "Instrumentation et Bonnes Pratiques de Laboratoire", filiere: "CBG", montant: 1000, actif: true },
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
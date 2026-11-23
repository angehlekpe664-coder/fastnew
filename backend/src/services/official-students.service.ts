import ExcelJS from "exceljs";
import { getSupabaseAdmin, isSupabaseConfigured } from "../lib/supabase.js";
import { listActiveTp } from "../data/tp-catalog.js";
import { logger } from "../logger.js";

export type OfficialStudent = {
  id?: string;
  matricule: string;
  nom: string;
  prenom: string;
  filiere: string;
  created_at?: string;
};

const localRoster = new Map<string, OfficialStudent>();

export function clearLocalRoster() {
  localRoster.clear();
}

/** Lit le fichier Excel d'étudiants (Matricule, Nom, Prénom, Filière) avec gestion d'erreur détaillée */
export async function parseOfficialStudentsExcel(buffer: Buffer): Promise<OfficialStudent[]> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(Buffer.from(buffer) as any);
  } catch (err) {
    throw new Error(
      `Impossible de lire le fichier Excel. Vérifiez que le fichier est un .xlsx valide. Erreur : ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  let sheet = workbook.getWorksheet("Etudiants") || workbook.getWorksheet("Étudiants");

  if (!sheet) {
    for (const ws of workbook.worksheets) {
      let found = false;
      ws.eachRow((row, rowNum) => {
        if (rowNum <= 5) {
          const text = (row.values as Array<unknown>).map((v) => String(v ?? "").toLowerCase()).join(" ");
          if (text.includes("matricule") || text.includes("mat")) {
            found = true;
          }
        }
      });
      if (found) {
        sheet = ws;
        break;
      }
    }
  }

  if (!sheet) sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Le fichier Excel ne contient aucune feuille de calcul.");

  const students: OfficialStudent[] = [];
  let headerMap: Record<string, number> = {};
  let headerRowFound = false;

  sheet.eachRow((row, rowNumber) => {
    const values = (row.values as Array<unknown>).map((v) => (v !== null && v !== undefined ? String(v).trim() : ""));

    if (!headerRowFound || Object.keys(headerMap).length === 0) {
      const lower = values.map((v) => v.toLowerCase());
      const matIdx = lower.findIndex((v) => v.includes("matricule") || v === "mat" || v.includes("num"));
      const nomIdx = lower.findIndex((v) => v === "nom" || v.includes("nom"));
      const prenomIdx = lower.findIndex((v) => v.includes("prénom") || v.includes("prenom") || v.includes("postnom"));
      const filIdx = lower.findIndex((v) => v.includes("filière") || v.includes("filiere") || v.includes("departement"));

      if (matIdx !== -1 && nomIdx !== -1) {
        headerMap = {
          matricule: matIdx,
          nom: nomIdx,
          prenom: prenomIdx !== -1 ? prenomIdx : nomIdx,
          filiere: filIdx !== -1 ? filIdx : -1,
        };
        headerRowFound = true;
        return;
      }
    }

    if (headerRowFound && rowNumber > 1 && Object.keys(headerMap).length > 0) {
      const rawMat = values[headerMap.matricule];
      const rawNom = values[headerMap.nom];
      const rawPrenom = headerMap.prenom !== -1 ? values[headerMap.prenom] : "";
      const rawFil = headerMap.filiere !== -1 ? values[headerMap.filiere] : "MIA";

      if (rawMat && rawNom) {
        const cleanMat = rawMat.replace(/[^0-9A-Z]/gi, "").toUpperCase();
        if (cleanMat.length >= 3) {
          students.push({
            matricule: cleanMat,
            nom: rawNom.toUpperCase(),
            prenom: rawPrenom,
            filiere: (rawFil || "MIA").toUpperCase(),
          });
        }
      }
    }
  });

  if (!headerRowFound || students.length === 0) {
    throw new Error(
      `Format de colonnes non reconnu dans la feuille « ${sheet.name} ». Le fichier Excel doit impérativement contenir une ligne d'en-tête avec les colonnes « Matricule » et « Nom » (ex: base_etudiants.xlsx).`
    );
  }

  return students;
}

/** Enregistre ou fusionne la base officielle d'étudiants */
export async function importOfficialStudents(
  buffer: Buffer,
  mode: "merge" | "replace" = "merge"
): Promise<{ count: number; mode: string }> {
  const parsed = await parseOfficialStudentsExcel(buffer);
  if (!parsed.length) {
    throw new Error("Aucun étudiant valide trouvé dans le fichier Excel.");
  }

  if (isSupabaseConfigured()) {
    const sb = getSupabaseAdmin();

    if (mode === "replace") {
      const { error: delError } = await sb.from("official_students").delete().neq("matricule", "___NONE___");
      if (delError) {
        logger.error("Erreur suppression table official_students", { error: delError.message });
        throw new Error(`Erreur Supabase (Remplacement) : ${delError.message}`);
      }
    }

    const BATCH_SIZE = 250;
    for (let i = 0; i < parsed.length; i += BATCH_SIZE) {
      const batch = parsed.slice(i, i + BATCH_SIZE).map((s) => ({
        matricule: s.matricule,
        nom: s.nom,
        prenom: s.prenom,
        filiere: s.filiere,
      }));

      const { error } = await sb.from("official_students").upsert(batch, { onConflict: "matricule" });
      if (error) {
        logger.error(`Erreur insertion lot official_students (${i} à ${i + batch.length})`, { error: error.message });
        throw new Error(`Erreur d'enregistrement progressif en base Supabase (lot ${i}): ${error.message}. Vérifiez que la table official_students existe.`);
      }
    }
  } else {
    if (mode === "replace") localRoster.clear();
    for (const s of parsed) {
      localRoster.set(s.matricule, s);
    }
  }

  return { count: parsed.length, mode };
}

/** Recherche un étudiant dans la base officielle par son matricule */
export async function lookupOfficialStudent(matricule: string): Promise<OfficialStudent | null> {
  const cleanMat = matricule.replace(/[^0-9A-Z]/gi, "").toUpperCase();

  if (isSupabaseConfigured()) {
    const { data } = await getSupabaseAdmin()
      .from("official_students")
      .select("matricule, nom, prenom, filiere")
      .eq("matricule", cleanMat)
      .maybeSingle();

    if (data) return data;
  }

  return localRoster.get(cleanMat) ?? null;
}

/** Vérifie si la base officielle comporte au moins un étudiant */
export async function isOfficialRosterActive(): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const { count } = await getSupabaseAdmin()
      .from("official_students")
      .select("*", { count: "exact", head: true });
    return (count ?? 0) > 0;
  }
  return localRoster.size > 0;
}

/** Réconcilie un fichier Excel de présence/étudiants et génère un PV multi-onglets par filière */
export async function generateReconciledTpExcel(buffer: Buffer): Promise<Buffer> {
  const activeTps = await listActiveTp();
  const sb = getSupabaseAdmin();

  let validatedStudents: Array<{ matricule: string; code_tp: string; filiere: string; validation_id: string }> = [];
  if (isSupabaseConfigured()) {
    const { data } = await sb.from("validated_students").select("matricule, code_tp, filiere, validation_id");
    validatedStudents = data ?? [];
  }

  const validatedSet = new Set<string>();
  for (const v of validatedStudents) {
    const key = `${v.matricule.toUpperCase()}:${v.code_tp.toUpperCase()}`;
    validatedSet.add(key);
  }

  const inputStudents = await parseOfficialStudentsExcel(buffer);

  const byFiliere: Record<string, OfficialStudent[]> = {};
  for (const s of inputStudents) {
    const fil = (s.filiere || "MIA").toUpperCase();
    if (!byFiliere[fil]) byFiliere[fil] = [];
    byFiliere[fil].push(s);
  }

  const outputWorkbook = new ExcelJS.Workbook();
  const filiereKeys = Object.keys(byFiliere).length ? Object.keys(byFiliere) : ["GLOBAL"];

  for (const filiere of filiereKeys) {
    const studentsInFil = byFiliere[filiere] ?? inputStudents;
    const tpsForFil = activeTps.filter((tp) => tp.filiere.toUpperCase() === filiere || filiere === "GLOBAL");

    const sheetName = filiere.slice(0, 30);
    const sheet = outputWorkbook.addWorksheet(`Filière ${sheetName}`);

    const columns = [
      { header: "Matricule", key: "matricule", width: 16 },
      { header: "Nom", key: "nom", width: 18 },
      { header: "Prénom(s)", key: "prenom", width: 20 },
      { header: "Filière", key: "filiere", width: 12 },
    ];

    for (const tp of tpsForFil) {
      columns.push({
        header: `TP: ${tp.code} (${tp.title})`,
        key: `tp_${tp.code}`,
        width: 26,
      });
    }

    sheet.columns = columns;

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "1E293B" },
    };
    headerRow.height = 26;

    for (const student of studentsInFil) {
      const rowData: Record<string, string> = {
        matricule: student.matricule,
        nom: student.nom,
        prenom: student.prenom,
        filiere: student.filiere,
      };

      for (const tp of tpsForFil) {
        const key = `${student.matricule.toUpperCase()}:${tp.code.toUpperCase()}`;
        const isVerified = validatedSet.has(key);
        rowData[`tp_${tp.code}`] = isVerified ? "VÉRIFIÉ" : "NON VÉRIFIÉ";
      }

      const addedRow = sheet.addRow(rowData);
      addedRow.height = 22;

      tpsForFil.forEach((tp, idx) => {
        const colIdx = 5 + idx;
        const cell = addedRow.getCell(colIdx);
        const val = String(cell.value);

        if (val === "VÉRIFIÉ") {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "D1FAE5" },
          };
          cell.font = { bold: true, color: { argb: "065F46" } };
        } else {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FEE2E2" },
          };
          cell.font = { bold: true, color: { argb: "991B1B" } };
        }
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
    }
  }

  return Buffer.from(await outputWorkbook.xlsx.writeBuffer());
}

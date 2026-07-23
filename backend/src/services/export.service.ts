import ExcelJS from "exceljs";

type Student = {
  validation_id: string;
  nom: string;
  prenom: string;
  matricule: string;
  filiere: string;
  code_tp: string;
  tp_title: string;
  numero_quittance: string;
  montant: number;
  date_paiement: string | null;
  date_verification: string;
  statut: string;
};

export async function exportStudentsToExcel(students: Student[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Validés");
  sheet.columns = [
    { header: "ID Validation", key: "validation_id", width: 22 },
    { header: "Nom", key: "nom", width: 16 },
    { header: "Prénom", key: "prenom", width: 16 },
    { header: "Matricule", key: "matricule", width: 14 },
    { header: "Filière", key: "filiere", width: 10 },
    { header: "Code TP", key: "code_tp", width: 12 },
    { header: "TP", key: "tp_title", width: 28 },
    { header: "Quittance", key: "numero_quittance", width: 22 },
    { header: "Montant", key: "montant", width: 12 },
    { header: "Vérification", key: "date_verification", width: 20 },
    { header: "Statut", key: "statut", width: 10 },
  ];
  for (const s of students) sheet.addRow(s);
  sheet.getRow(1).font = { bold: true };
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export function exportStudentsToCsv(students: Student[]): string {
  const headers = ["validation_id","nom","prenom","matricule","filiere","code_tp","tp_title","numero_quittance","montant","date_verification","statut"];
  const rows = students.map((s) =>
    headers.map((h) => `"${String((s as Record<string, unknown>)[h] ?? "").toString().replace(/"/g, '""')}"`).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

export function exportStudentsToPdf(students: Student[]): string {
  return [
    "UNIPAY TP — EXPORT",
    `Généré : ${new Date().toLocaleString("fr-FR")}`,
    `Total : ${students.length}`,
    "",
    ...students.map((s, i) =>
      `${i + 1}. ${s.prenom} ${s.nom} (${s.matricule}) | ${s.filiere} | ${s.code_tp} ${s.tp_title} | ${s.numero_quittance} | ${s.montant} FCFA | ${s.validation_id}`
    ),
  ].join("\n");
}

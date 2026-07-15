import ExcelJS from "exceljs";
import type { ValidatedStudent } from "@prisma/client";

export async function exportStudentsToExcel(students: ValidatedStudent[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Étudiants validés");

  sheet.columns = [
    { header: "ID Validation", key: "validationId", width: 22 },
    { header: "Nom", key: "nom", width: 18 },
    { header: "Prénom", key: "prenom", width: 18 },
    { header: "Faculté", key: "faculte", width: 20 },
    { header: "Département", key: "departement", width: 20 },
    { header: "Filière", key: "filiere", width: 15 },
    { header: "Niveau", key: "niveau", width: 10 },
    { header: "N° Quittance", key: "numeroQuittance", width: 24 },
    { header: "Montant (FCFA)", key: "montant", width: 14 },
    { header: "Date paiement", key: "datePaiement", width: 16 },
    { header: "Date vérification", key: "dateVerification", width: 20 },
    { header: "Statut", key: "statut", width: 12 },
  ];

  for (const s of students) {
    sheet.addRow({
      ...s,
      datePaiement: s.datePaiement?.toLocaleDateString("fr-FR") ?? "",
      dateVerification: s.dateVerification.toLocaleString("fr-FR"),
    });
  }

  sheet.getRow(1).font = { bold: true };
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function exportStudentsToCsv(students: ValidatedStudent[]): string {
  const headers = [
    "validationId", "nom", "prenom", "faculte", "departement", "filiere", "niveau",
    "numeroQuittance", "montant", "datePaiement", "dateVerification", "statut",
  ];
  const rows = students.map((s) =>
    [
      s.validationId,
      s.nom,
      s.prenom,
      s.faculte,
      s.departement,
      s.filiere,
      s.niveau,
      s.numeroQuittance,
      s.montant,
      s.datePaiement?.toISOString() ?? "",
      s.dateVerification.toISOString(),
      s.statut,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

export function exportStudentsToPdf(students: ValidatedStudent[]): string {
  const lines = [
    "UNIPAY TP - EXPORT DES ÉTUDIANTS VALIDÉS",
    `Généré le ${new Date().toLocaleString("fr-FR")}`,
    `Total : ${students.length}`,
    "",
    ...students.map(
      (s, i) =>
        `${i + 1}. ${s.prenom} ${s.nom} | ${s.filiere} ${s.niveau} | Quittance: ${s.numeroQuittance} | ${s.montant} FCFA | ID: ${s.validationId}`
    ),
  ];
  return lines.join("\n");
}

import fs from "fs/promises";
import { parseReceiptBuffer } from "../services/receipt-parser.service.js";
import { analyzeDocumentIntegrity } from "../services/document-integrity.service.js";

async function runFalsificationTest() {
  console.log("=== Test de détection automatique des quittances falsifiées ===");

  const set1Real = "/home/branel/Téléchargements/varwwwhtmlwp-contentthemesmaterialfichiersquittances14667150-a5-l.pdf";
  const set1Fake = "/home/branel/Téléchargements/varwwwhtmlwp-contentthemesmaterialfichiersquittances14667150-a5-l (1).pdf";

  const set2Real = "/home/branel/Téléchargements/testes/3/varwwwhtmlwp-contentthemesmaterialfichiersquittances14732696-a5-l.pdf";
  const set2Fake = "/home/branel/Téléchargements/testes/3/varwwwhtmlwp-contentthemesmaterialfichiersquittances14836513-a5______.pdf";

  // --- SERIE 1 ---
  try {
    await fs.access(set1Real);
    console.log("\n--- SÉRIE 1 (ICUID / Sliced text) ---");
    const bufReal1 = await fs.readFile(set1Real);
    const parsedReal1 = await parseReceiptBuffer(bufReal1, "application/pdf");
    const reportReal1 = analyzeDocumentIntegrity(parsedReal1.rawText, {
      expectedTp: "INF1421",
      metadataInfo: parsedReal1.metadataInfo,
      securityAnalysis: parsedReal1.securityAnalysis,
      mimeType: "application/pdf",
    });
    console.log("Série 1 - Vraie Quittance Passed:", reportReal1.passed);
    if (!reportReal1.passed) throw new Error(`Vraie quittance série 1 rejetée: ${reportReal1.blockingMotif}`);

    const bufFake1 = await fs.readFile(set1Fake);
    const parsedFake1 = await parseReceiptBuffer(bufFake1, "application/pdf");
    const reportFake1 = analyzeDocumentIntegrity(parsedFake1.rawText, {
      expectedTp: "INF1422",
      metadataInfo: parsedFake1.metadataInfo,
      securityAnalysis: parsedFake1.securityAnalysis,
      mimeType: "application/pdf",
    });
    console.log("Série 1 - Fausse Quittance Passed:", reportFake1.passed);
    console.log("Série 1 - Motif refus:", reportFake1.blockingMotif);
    if (reportFake1.passed) throw new Error("Fausse quittance série 1 acceptée par erreur !");
  } catch (err: any) {
    if (err.code === "ENOENT") {
      console.log("Fichiers série 1 non trouvés, étape ignorée.");
    } else {
      throw err;
    }
  }

  // --- SERIE 2 (LibreOffice Draw / Retouche) ---
  try {
    await fs.access(set2Real);
    console.log("\n--- SÉRIE 2 (LibreOffice Draw Export) ---");
    const bufReal2 = await fs.readFile(set2Real);
    const parsedReal2 = await parseReceiptBuffer(bufReal2, "application/pdf");
    const reportReal2 = analyzeDocumentIntegrity(parsedReal2.rawText, {
      expectedTp: "INF1421",
      metadataInfo: parsedReal2.metadataInfo,
      securityAnalysis: parsedReal2.securityAnalysis,
      mimeType: "application/pdf",
    });
    console.log("Série 2 - Vraie Quittance (14732696) Passed:", reportReal2.passed);
    if (!reportReal2.passed) throw new Error(`Vraie quittance série 2 rejetée: ${reportReal2.blockingMotif}`);

    const bufFake2 = await fs.readFile(set2Fake);
    const parsedFake2 = await parseReceiptBuffer(bufFake2, "application/pdf");
    const reportFake2 = analyzeDocumentIntegrity(parsedFake2.rawText, {
      expectedTp: "CHM1226-1",
      metadataInfo: parsedFake2.metadataInfo,
      securityAnalysis: parsedFake2.securityAnalysis,
      mimeType: "application/pdf",
    });
    console.log("Série 2 - Fausse Quittance (14836513) Passed:", reportFake2.passed);
    console.log("Série 2 - Motif refus:", reportFake2.blockingMotif);
    if (reportFake2.passed) throw new Error("Fausse quittance série 2 acceptée par erreur !");
  } catch (err: any) {
    if (err.code === "ENOENT") {
      console.log("Fichiers série 2 non trouvés, étape ignorée.");
    } else {
      throw err;
    }
  }

  console.log("\n✅ TOUS LES TESTS DE DÉTECTION FORENSIQUE SONT PASSÉS AVEC SUCCÈS !");
}

runFalsificationTest().catch((err) => {
  console.error("❌ ÉCHEC DU TEST FORENSIQUE :", err);
  process.exit(1);
});

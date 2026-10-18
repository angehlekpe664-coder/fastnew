import fs from "fs/promises";
import path from "path";
import { parseReceiptBuffer } from "../services/receipt-parser.service.js";
import { analyzeDocumentIntegrity } from "../services/document-integrity.service.js";

async function runFalsificationTest() {
  console.log("=== Test de détection automatique des quittances falsifiées ===");

  const realPath = "/home/branel/Téléchargements/varwwwhtmlwp-contentthemesmaterialfichiersquittances14667150-a5-l.pdf";
  const fakePath = "/home/branel/Téléchargements/varwwwhtmlwp-contentthemesmaterialfichiersquittances14667150-a5-l (1).pdf";

  let hasRealFile = false;
  try {
    await fs.access(realPath);
    hasRealFile = true;
  } catch {
    console.log("Fichiers de test locaux non trouvés dans ~/Téléchargements, test ignoré.");
    return;
  }

  if (!hasRealFile) return;

  // 1. Test Quittance Authentique (INF1421)
  const realBuffer = await fs.readFile(realPath);
  const realParsed = await parseReceiptBuffer(realBuffer, "application/pdf");
  const realIntegrity = analyzeDocumentIntegrity(realParsed.rawText, {
    expectedTp: "INF1421",
    metadataInfo: realParsed.metadataInfo,
    securityAnalysis: realParsed.securityAnalysis,
    mimeType: "application/pdf",
  });

  console.log("Test Quittance Réelle - Integrity Passed:", realIntegrity.passed);
  if (!realIntegrity.passed) {
    throw new Error(`La vraie quittance a été rejetée à tort : ${realIntegrity.blockingMotif}`);
  }

  // 2. Test Quittance Falsifiée (INF1422 - Fausse)
  const fakeBuffer = await fs.readFile(fakePath);
  const fakeParsed = await parseReceiptBuffer(fakeBuffer, "application/pdf");
  const fakeIntegrity = analyzeDocumentIntegrity(fakeParsed.rawText, {
    expectedTp: "INF1422",
    metadataInfo: fakeParsed.metadataInfo,
    securityAnalysis: fakeParsed.securityAnalysis,
    mimeType: "application/pdf",
  });

  console.log("Test Quittance Falsifiée - Integrity Passed:", fakeIntegrity.passed);
  console.log("Test Quittance Falsifiée - Motif de refus:", fakeIntegrity.blockingMotif);

  if (fakeIntegrity.passed) {
    throw new Error("La quittance falsifiée a été acceptée par erreur !");
  }

  console.log("\n✅ TEST DE DÉTECTION DE FALSIFICATION RÉUSSI AVEC SUCCÈS !");
}

runFalsificationTest().catch((err) => {
  console.error("❌ ECHEC DU TEST FORENSIQUE :", err);
  process.exit(1);
});

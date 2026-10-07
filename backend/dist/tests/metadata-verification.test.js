import { extractDocumentMetadata } from "../services/receipt-parser.service.js";
import { analyzeDocumentIntegrity } from "../services/document-integrity.service.js";
async function runTests() {
    console.log("=== Running Metadata Verification Tests ===");
    // Test 1: Original Clean PDF Document Buffer
    const cleanPdfBuffer = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Producer (iText 2.1.7) /Creator (JasperReports) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF");
    const cleanPdfInfo = { Producer: "iText 2.1.7", Creator: "JasperReports" };
    const cleanMeta = extractDocumentMetadata(cleanPdfBuffer, "application/pdf", cleanPdfInfo);
    console.log("Test 1 - Clean PDF:", cleanMeta.isModified ? "FAILED (False positive)" : "PASSED");
    if (cleanMeta.isModified)
        throw new Error("Clean PDF wrongly flagged as modified.");
    const cleanReport = analyzeDocumentIntegrity("Partie versante: KOUADIO Jean (INF1001)\nQuittance n° 123456-78\nSomme arrêtée : 1000 FCFA", { metadataInfo: cleanMeta });
    console.log("Test 1 - Integrity Report Passed:", cleanReport.passed);
    if (!cleanReport.passed)
        throw new Error("Clean PDF integrity report failed.");
    // Test 2: Modified PDF with Photoshop signature
    const photoshopPdfBuffer = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Producer (Adobe Photoshop CC 2023) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF");
    const photoshopMeta = extractDocumentMetadata(photoshopPdfBuffer, "application/pdf", { Producer: "Adobe Photoshop CC 2023" });
    console.log("Test 2 - Photoshop PDF detected:", photoshopMeta.isModified && photoshopMeta.detectedEditingTools.includes("Photoshop") ? "PASSED" : "FAILED");
    const photoshopReport = analyzeDocumentIntegrity("Sample Text", { metadataInfo: photoshopMeta });
    console.log("Test 2 - Photoshop PDF Rejected:", !photoshopReport.passed);
    console.log("Test 2 - Blocking Motif:", photoshopReport.blockingMotif);
    if (photoshopReport.passed || !photoshopReport.blockingMotif?.includes("Photoshop")) {
        throw new Error("Photoshop PDF was not rejected with expected motif.");
    }
    // Test 3: Canva PDF
    const canvaBuffer = Buffer.from("%PDF-1.4\n/Creator (Canva)\n%%EOF");
    const canvaMeta = extractDocumentMetadata(canvaBuffer, "application/pdf", { Creator: "Canva" });
    const canvaReport = analyzeDocumentIntegrity("Sample Text", { metadataInfo: canvaMeta });
    console.log("Test 3 - Canva PDF detected and rejected:", !canvaReport.passed ? "PASSED" : "FAILED");
    console.log("Test 3 - Blocking Motif:", canvaReport.blockingMotif);
    if (canvaReport.passed || !canvaReport.blockingMotif?.includes("Canva")) {
        throw new Error("Canva PDF was not rejected with expected motif.");
    }
    // Test 4: PDF24 / iLovePDF Online Editing Tools
    const pdf24Buffer = Buffer.from("%PDF-1.4\n/Producer (PDF24 Creator / iLovePDF)\n%%EOF");
    const pdf24Meta = extractDocumentMetadata(pdf24Buffer, "application/pdf", { Producer: "PDF24 Creator / iLovePDF" });
    const pdf24Report = analyzeDocumentIntegrity("Sample Text", { metadataInfo: pdf24Meta });
    console.log("Test 4 - PDF24/iLovePDF detected:", !pdf24Report.passed ? "PASSED" : "FAILED");
    console.log("Test 4 - Blocking Motif:", pdf24Report.blockingMotif);
    console.log("\n✅ ALL METADATA VERIFICATION TESTS PASSED SUCCESSFULLY!");
}
runTests().catch((err) => {
    console.error("❌ TEST FAILURE:", err);
    process.exit(1);
});

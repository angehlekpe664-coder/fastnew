import { createHash } from "node:crypto";
import {
  analyzeDocumentSecurity,
  analyzePdfByteRange,
} from "../services/receipt-parser.service.js";
import { analyzeDocumentIntegrity } from "../services/document-integrity.service.js";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

function signedPdfFixture(): Buffer {
  const prefix = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Sig /Filter /Adobe.PPKLite /SubFilter /adbe.pkcs7.detached /ByteRange [");
  const placeholderRange = Buffer.from("0 0000000000 0000000000 0000000000");
  const mid = Buffer.from("] /Contents <");
  const contents = Buffer.from("30".repeat(64));
  const suffix = Buffer.from("> >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n");
  const beforeRange = prefix.length;
  const afterRange = beforeRange + placeholderRange.length;
  const contentsStart = afterRange + mid.length;
  const contentsEnd = contentsStart + contents.length;
  const total = contentsEnd + suffix.length;
  const l1 = contentsStart;
  const s2 = contentsEnd;
  const l2 = total - s2;
  const range = Buffer.from(
    `${String(0).padStart(1, " ")} ${String(l1).padStart(10, "0")} ${String(s2).padStart(10, "0")} ${String(l2).padStart(10, "0")}`
  );
  if (range.length !== placeholderRange.length) {
    throw new Error(`ByteRange length mismatch ${range.length} vs ${placeholderRange.length}`);
  }
  return Buffer.concat([prefix, range, mid, contents, suffix]);
}

async function runTests() {
  console.log("=== Advanced security (PKI / vector) ===");

  const vectorPdf = Buffer.from(
    "%PDF-1.4\n/Type /Font /Subtype /TrueType\nBT\n/F1 12 Tf (Quittance) Tj\nET\n%%EOF"
  );
  const vectorSec = analyzeDocumentSecurity(vectorPdf, "application/pdf");
  assert(vectorSec.isVectorDocument, "PDF vectoriel non détecté");
  assert(vectorSec.fontCount > 0, "Polices absentes");
  console.log("Test structure vectorielle native: PASSED");

  const rasterPdf = Buffer.from(
    "%PDF-1.4\n/Subtype /Image /Width 1200 /Height 1600 /Filter /DCTDecode stream\nxxxx\nendstream\n%%EOF"
  );
  const rasterSec = analyzeDocumentSecurity(rasterPdf, "application/pdf");
  assert(!rasterSec.isVectorDocument, "PDF raster non détecté");
  const rasterReport = analyzeDocumentIntegrity("Quittance n° 123456", {
    checkVectorStructure: true,
    mimeType: "application/pdf",
    securityAnalysis: rasterSec,
  });
  assert(!rasterReport.passed, "Raster devrait être refusé");
  assert(rasterReport.blockingMotif?.includes("vectorielle"), `Motif raster inattendu: ${rasterReport.blockingMotif}`);
  console.log("Test anti-image raster: PASSED");

  const signed = signedPdfFixture();
  const raw = signed.toString("binary");
  const pki = analyzePdfByteRange(signed, raw);
  assert(pki.hasSignature, "Signature absente sur fixture PKI");
  assert(pki.isValid, `Signature fixture invalide: ${pki.detail}`);
  assert(pki.sha256 && pki.sha256.length === 64, "SHA-256 manquant");
  console.log("Test PKI ByteRange + SHA-256: PASSED");

  const tampered = Buffer.from(signed);
  tampered[tampered.length - 8] = tampered[tampered.length - 8] ^ 0xff;
  const tamperedPki = analyzePdfByteRange(tampered, tampered.toString("binary"));
  assert(tamperedPki.hasSignature, "Tamper: signature toujours présente");
  const pkiReport = analyzeDocumentIntegrity("x", {
    checkPkiSignature: true,
    securityAnalysis: {
      hasDigitalSignature: true,
      isSignatureValid: false,
      isVectorDocument: true,
      fontCount: 2,
      textBlockCount: 1,
      imageXObjectCount: 0,
      hasImageOverlay: false,
    },
  });
  assert(!pkiReport.passed, "PKI rompue devrait échouer");
  assert(
    pkiReport.blockingMotif === "Signature numérique rompue ou modifiée après émission.",
    `Motif PKI inattendu: ${pkiReport.blockingMotif}`
  );
  console.log("Test rupture de hachage / signature: PASSED");

  console.log("\n✅ ALL ADVANCED SECURITY TESTS PASSED");
}

runTests().catch((err) => {
  console.error("❌ TEST FAILURE:", err);
  process.exit(1);
});

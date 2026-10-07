import { createHash } from "node:crypto";
import { analyzeDocumentSecurity, analyzePdfByteRange, validateLuhn, validateModulo11, verifyQuittanceChecksum, } from "../services/receipt-parser.service.js";
import { analyzeDocumentIntegrity } from "../services/document-integrity.service.js";
function assert(cond, msg) {
    if (!cond)
        throw new Error(msg);
}
function luhnAppendCheck(body) {
    for (let d = 0; d <= 9; d++) {
        const candidate = body + String(d);
        if (validateLuhn(candidate))
            return candidate;
    }
    throw new Error("Impossible de construire un numéro Luhn.");
}
function mod11AppendCheck(body) {
    for (let d = 0; d <= 9; d++) {
        const candidate = body + String(d);
        if (validateModulo11(candidate))
            return candidate;
    }
    throw new Error("Impossible de construire un numéro Modulo 11.");
}
function signedPdfFixture() {
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
    const range = Buffer.from(`${String(0).padStart(1, " ")} ${String(l1).padStart(10, "0")} ${String(s2).padStart(10, "0")} ${String(l2).padStart(10, "0")}`);
    if (range.length !== placeholderRange.length) {
        throw new Error(`ByteRange length mismatch ${range.length} vs ${placeholderRange.length}`);
    }
    return Buffer.concat([prefix, range, mid, contents, suffix]);
}
async function runTests() {
    console.log("=== Advanced security (PKI / vector / checksum) ===");
    const luhnOk = luhnAppendCheck("12345678901");
    const luhnBad = luhnOk.slice(0, -1) + String((Number(luhnOk.slice(-1)) + 1) % 10);
    assert(validateLuhn(luhnOk), "Luhn valide attendu");
    assert(!validateLuhn(luhnBad), "Luhn invalide attendu");
    console.log("Test checksum Luhn: PASSED");
    const modOk = mod11AppendCheck("9876543210");
    const modBad = modOk.slice(0, -1) + String((Number(modOk.slice(-1)) + 1) % 10);
    assert(validateModulo11(modOk), "Modulo 11 valide attendu");
    assert(!validateModulo11(modBad) || modBad === modOk, "Modulo 11 distinct");
    assert(!verifyQuittanceChecksum("12345678"), "12345678 ne doit passer ni Luhn ni Mod11");
    assert(verifyQuittanceChecksum(luhnOk), "verifyQuittanceChecksum Luhn");
    console.log("Test checksum Modulo 11 / Luhn: PASSED");
    const vectorPdf = Buffer.from("%PDF-1.4\n/Type /Font /Subtype /TrueType\nBT\n/F1 12 Tf (Quittance) Tj\nET\n%%EOF");
    const vectorSec = analyzeDocumentSecurity(vectorPdf, "application/pdf", luhnOk);
    assert(vectorSec.isVectorDocument, "PDF vectoriel non détecté");
    assert(vectorSec.fontCount > 0, "Polices absentes");
    console.log("Test structure vectorielle native: PASSED");
    const rasterPdf = Buffer.from("%PDF-1.4\n/Subtype /Image /Width 1200 /Height 1600 /Filter /DCTDecode stream\nxxxx\nendstream\n%%EOF");
    const rasterSec = analyzeDocumentSecurity(rasterPdf, "application/pdf", luhnOk);
    assert(!rasterSec.isVectorDocument, "PDF raster non détecté");
    const rasterReport = analyzeDocumentIntegrity("Quittance n° " + luhnOk, {
        checkVectorStructure: true,
        checkQuittanceChecksum: true,
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
    const signedAgain = createHash("sha256")
        .update(Buffer.concat([signed.subarray(0, pki.covered > 0 ? signed.length : 0)]))
        .digest("hex");
    assert(typeof signedAgain === "string", "hash de contrôle");
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
            quittanceChecksumPassed: true,
            referenceChecksumPassed: true,
        },
    });
    assert(!pkiReport.passed, "PKI rompue devrait échouer");
    assert(pkiReport.blockingMotif === "Signature numérique rompue ou modifiée après émission.", `Motif PKI inattendu: ${pkiReport.blockingMotif}`);
    console.log("Test rupture de hachage / signature: PASSED");
    const checksumReport = analyzeDocumentIntegrity("Quittance n° 11111111", {
        checkQuittanceChecksum: true,
        securityAnalysis: {
            hasDigitalSignature: false,
            isSignatureValid: true,
            isVectorDocument: true,
            fontCount: 3,
            textBlockCount: 2,
            imageXObjectCount: 0,
            hasImageOverlay: false,
            quittanceChecksumPassed: false,
            referenceChecksumPassed: true,
        },
    });
    assert(checksumReport.blockingMotif ===
        "Numéro de quittance non conforme (échec de la clé de contrôle mathématique).", `Motif checksum inattendu: ${checksumReport.blockingMotif}`);
    console.log("Test motif checksum: PASSED");
    console.log("\n✅ ALL ADVANCED SECURITY TESTS PASSED");
}
runTests().catch((err) => {
    console.error("❌ TEST FAILURE:", err);
    process.exit(1);
});

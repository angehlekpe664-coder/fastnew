const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require("firebase-admin");
const Busboy = require("busboy");
const jsqr = require("jsqr");
const { PNG } = require("pngjs");
const fetch = require("node-fetch");
const https = require("https");

// Initialiser Firebase Admin pour accéder à Firestore
try {
  admin.initializeApp();
} catch (e) {
  console.log("Firebase Admin déjà initialisé ou non disponible dans cet environnement local.");
}

const db = admin.apps.length > 0 ? admin.firestore() : null;

// Initialiser Gemini
// La clé API doit être définie dans la variable d'environnement GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Extrait l'URL de vérification du Trésor Public depuis un fichier PDF (recherche textuelle/binaire)
 */
function extractQrUrlFromPdfBuffer(buffer) {
  try {
    const content = buffer.toString("utf-8");
    // Expression régulière pour capturer l'URL officielle du Trésor Bénin
    const regex = /(https:\/\/equittancetresor\.finances\.bj:9051\/paiement-efc\/\?[^\s"'>\)]+)/g;
    const matches = content.match(regex);
    if (matches && matches.length > 0) {
      // Nettoyer l'URL trouvée (enlever les caractères résiduels du PDF)
      let url = matches[0].split(/[\\)"]/)[0];
      return url;
    }
  } catch (e) {
    console.error("Erreur lors de la recherche de l'URL dans le PDF :", e);
  }
  return null;
}

/**
 * Tente de décoder le QR code d'une image PNG
 */
async function decodeQrFromImageBuffer(buffer) {
  return new Promise((resolve) => {
    try {
      new PNG({ filterType: 4 }).parse(buffer, (error, data) => {
        if (error) {
          console.error("Erreur lors du décodage de l'image PNG :", error);
          resolve(null);
          return;
        }
        const code = jsqr(data.data, data.width, data.height);
        if (code) {
          resolve(code.data);
        } else {
          resolve(null);
        }
      });
    } catch (e) {
      console.error("Exception lors de la lecture de l'image QR :", e);
      resolve(null);
    }
  });
}

/**
 * Requête le site du Trésor Public pour obtenir le contenu réel de la quittance
 */
async function fetchTreasuryPage(url) {
  const agent = new https.Agent({
    rejectUnauthorized: false // Ignorer les alertes de certificats auto-signés du serveur étatique
  });

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3"
      },
      agent,
      timeout: 10000 // Limite de 10 secondes
    });
    
    if (response.ok) {
      const html = await response.text();
      return html;
    } else {
      console.warn(`Le serveur du Trésor a renvoyé un code d'erreur : ${response.status}`);
    }
  } catch (e) {
    console.error("Impossible de joindre le site du Trésor Public :", e.message);
  }
  return null;
}

/**
 * Point d'entrée de la Google Cloud Function
 */
exports.verifyReceipt = async (req, res) => {
  // Configurer CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée. Utilisez POST." });
    return;
  }

  const busboy = Busboy({ headers: req.headers });
  let fileBuffer = null;
  let fileName = "";
  let fileMimeType = "";
  let studentNameFromApp = "";

  // Récupérer les champs texte
  busboy.on("field", (fieldname, val) => {
    if (fieldname === "studentName") {
      studentNameFromApp = val;
    }
  });

  // Récupérer le fichier quittance
  busboy.on("file", (fieldname, file, info) => {
    const { filename, mimeType } = info;
    fileName = filename;
    fileMimeType = mimeType;
    const chunks = [];

    file.on("data", (chunk) => {
      chunks.push(chunk);
    });

    file.on("end", () => {
      fileBuffer = Buffer.concat(chunks);
    });
  });

  busboy.on("finish", async () => {
    if (!fileBuffer) {
      res.status(400).json({ error: "Aucun fichier de quittance trouvé sous la clé 'receipt'." });
      return;
    }

    try {
      console.log(`Début de l'analyse pour le fichier : ${fileName} (${fileMimeType})`);
      
      // --- ÉTAPE 1 : Extraction du QR Code (URL de vérification) ---
      let qrUrl = null;
      if (fileMimeType === "application/pdf" || fileName.endsWith(".pdf")) {
        qrUrl = extractQrUrlFromPdfBuffer(fileBuffer);
      } else {
        qrUrl = await decodeQrFromImageBuffer(fileBuffer);
      }

      console.log("QR Code détecté :", qrUrl);

      // --- ÉTAPE 2 : Analyse OCR & IA avec Gemini ---
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const filePart = {
        inlineData: {
          data: fileBuffer.toString("base64"),
          mimeType: fileMimeType
        }
      };

      const prompt = `Analyses cette quittance de paiement universitaire. Extrais les informations suivantes au format JSON uniquement.
      Respectes scrupuleusement la structure suivante :
      {
        "quittanceNumber": "Numéro de la quittance (ex: 2601516152-001D/CE)",
        "amount": 1000, // Le montant total payé sous forme de nombre entier (ex: 1000)
        "transactionId": "ID/Référence de transaction Mobile Money/MTN/Moov (ex: BJ6600100100000104759707)",
        "studentName": "Nom de l'étudiant figurant sur la quittance (ex: Ange HLEKPE)",
        "date": "Date de la quittance (ex: 16/04/2026)"
      }
      Rends uniquement le JSON brut, sans balises markdown de bloc de code.`;

      const geminiResult = await model.generateContent([filePart, prompt]);
      const geminiText = geminiResult.response.text().trim();
      
      let parsedData = {};
      try {
        parsedData = JSON.parse(geminiText.replace(/```json/g, "").replace(/```/g, "").trim());
      } catch (err) {
        console.error("Erreur de parsing de la réponse Gemini :", geminiText);
        throw new Error("Impossible d'extraire les données de la quittance.");
      }

      console.log("Données extraites par Gemini :", parsedData);

      // --- ÉTAPE 3 : Contrôles de sécurité Anti-Fraude ---

      // 1. Validation de l'origine du QR Code
      if (!qrUrl) {
        // Fallback si le QR code physique n'a pas pu être extrait mais que le texte semble correct
        console.warn("QR Code physique non détecté. Utilisation des données OCR.");
      } else {
        const allowedDomain = "equittancetresor.finances.bj";
        if (!qrUrl.includes(allowedDomain)) {
          res.status(200).json({
            verified: false,
            confidence: 1.0,
            message: "Fraude détectée : Le QR code pointe vers un site non officiel ou frauduleux !",
            data: parsedData
          });
          return;
        }
      }

      // 2. Validation de concordance d'identité avec l'application mobile
      if (studentNameFromApp && parsedData.studentName) {
        const cleanName = (name) => name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const appNameClean = cleanName(studentNameFromApp);
        const receiptNameClean = cleanName(parsedData.studentName);

        // Vérifier si des parties significatives du nom correspondent
        const appNameParts = appNameClean.split(/\s+/).filter(p => p.length > 2);
        const nameMatches = appNameParts.some(part => receiptNameClean.includes(part));

        if (!nameMatches) {
          res.status(200).json({
            verified: false,
            confidence: 0.95,
            message: `Le nom sur la quittance (${parsedData.studentName}) ne correspond pas à l'étudiant connecté (${studentNameFromApp}).`,
            data: parsedData
          });
          return;
        }
      }

      // 3. Validation de l'unicité de la transaction (Firestore)
      if (db && parsedData.transactionId) {
        const transactionRef = db.collection("verified_receipts").doc(parsedData.transactionId);
        const doc = await transactionRef.get();

        if (doc.exists) {
          res.status(200).json({
            verified: false,
            confidence: 1.0,
            message: "Fraude détectée : Cette quittance de paiement a déjà été utilisée pour un autre TP !",
            data: parsedData
          });
          return;
        }
      }

      // 4. Validation croisée avec le Trésor Public (Optionnel si serveur disponible)
      let treasuryVerified = false;
      if (qrUrl) {
        const treasuryHtml = await fetchTreasuryPage(qrUrl);
        if (treasuryHtml) {
          // Utiliser Gemini pour confronter l'HTML du Trésor avec les données de la quittance
          const validationPrompt = `Tu es un expert en sécurité financière. Voici le code source HTML de la page de vérification officielle du Trésor Public du Bénin :
          
          --- COMMENCEMENT HTML ---
          ${treasuryHtml.substring(0, 15000)}
          --- FIN HTML ---

          Et voici les données extraites du fichier PDF/Image de l'étudiant :
          - Numéro quittance : ${parsedData.quittanceNumber}
          - Montant déclaré : ${parsedData.amount} FCFA
          - Référence transaction : ${parsedData.transactionId}

          Vérifies si cette transaction est réelle, valide et correspond EXACTEMENT à la somme déclarée.
          Réponds uniquement avec ce format JSON brut :
          {
            "match": true, // true si le montant et les références concordent, false sinon
            "realAmount": 1000 // Le montant réel trouvé sur le site de l'état
          }`;

          const validationResult = await model.generateContent(validationPrompt);
          const validationText = validationResult.response.text().trim();
          try {
            const valJson = JSON.parse(validationText.replace(/```json/g, "").replace(/```/g, "").trim());
            if (valJson.match === true) {
              treasuryVerified = true;
              console.log("Validation croisée réussie avec les serveurs du Trésor !");
            } else {
              res.status(200).json({
                verified: false,
                confidence: 1.0,
                message: `Fraude détectée : Le montant réel sur le site du Trésor est de ${valJson.realAmount} FCFA, mais le document indique ${parsedData.amount} FCFA.`,
                data: parsedData
              });
              return;
            }
          } catch (e) {
            console.error("Impossible de parser le JSON de validation du Trésor :", e);
          }
        }
      }

      // Enregistrer la quittance dans Firestore pour bloquer les futurs doublons
      if (db && parsedData.transactionId) {
        await db.collection("verified_receipts").doc(parsedData.transactionId).set({
          quittanceNumber: parsedData.quittanceNumber || "",
          amount: parsedData.amount || 0,
          studentName: parsedData.studentName || "",
          date: parsedData.date || "",
          verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          studentNameFromApp: studentNameFromApp
        });
      }

      // Tout est valide
      res.status(200).json({
        verified: true,
        confidence: treasuryVerified ? 1.0 : 0.9,
        message: treasuryVerified 
          ? "Quittance authentifiée avec succès auprès de la Direction Générale du Trésor !" 
          : "Quittance analysée et validée avec succès par l'IA.",
        data: {
          transactionId: parsedData.transactionId,
          amount: `${parsedData.amount} FCFA`,
          date: parsedData.date,
          tpTitle: "FAST/PRODUITS ACCESSOIRES",
          tpCode: parsedData.quittanceNumber,
          student: parsedData.studentName
        }
      });

    } catch (error) {
      console.error("Erreur générale durant la vérification :", error);
      res.status(500).json({
        verified: false,
        message: `Erreur interne durant la vérification : ${error.message}`
      });
    }
  });

  busboy.end(req.rawBody);
};

/**
 * Cloudflare Worker - UniPay Receipt AI Validator
 * 
 * Ce script s'exécute dans l'environnement Cloudflare Workers.
 * Il reçoit le fichier de quittance (PDF/Image) de l'étudiant, extrait les informations
 * à l'aide de l'IA Gemini 1.5 Flash et valide la conformité du paiement auprès du Trésor Public du Bénin.
 */

export default {
  async fetch(request, env) {
    // 1. Définition des en-têtes CORS pour autoriser l'accès depuis l'application Flutter
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    };

    // Gérer la requête OPTIONS (Preflight)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Uniquement autoriser POST
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ 
        verified: false, 
        message: "Méthode non autorisée. Utilisez POST." 
      }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    try {
      // 2. Récupération de la clé API Gemini
      const geminiApiKey = env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        return new Response(JSON.stringify({
          verified: false,
          message: "Configuration manquante : La clé de l'API Gemini (GEMINI_API_KEY) n'est pas définie dans les variables d'environnement du Worker."
        }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // 3. Extraction du FormData (Multipart)
      const formData = await request.formData();
      const receiptFile = formData.get("receipt");
      const studentNameFromApp = formData.get("studentName") || "";

      if (!receiptFile || !(receiptFile instanceof File)) {
        return new Response(JSON.stringify({
          verified: false,
          message: "Erreur : Aucun fichier valide de reçu trouvé sous le paramètre 'receipt'."
        }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      const fileBuffer = await receiptFile.arrayBuffer();
      const fileMimeType = receiptFile.type || "application/octet-stream";
      const fileName = receiptFile.name || "receipt";

      console.log(`Début de l'analyse du reçu : ${fileName} (${fileMimeType})`);

      // 4. Extraction de l'URL du QR Code pour les PDF (recherche textuelle rapide)
      let qrUrl = null;
      if (fileMimeType === "application/pdf" || fileName.endsWith(".pdf")) {
        qrUrl = extractQrUrlFromPdf(fileBuffer);
        console.log("URL de vérification trouvée dans le PDF :", qrUrl);
      }

      // 5. Encodage du fichier en Base64 pour Gemini
      const base64Data = arrayBufferToBase64(fileBuffer);

      // 6. Appel direct à l'API Gemini via fetch
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
      
      const prompt = `Analyses cette quittance de paiement universitaire. Extrais les informations suivantes au format JSON uniquement.
Respectes scrupuleusement la structure suivante :
{
  "quittanceNumber": "Numéro de la quittance (ex: 2601516152-001D/CE)",
  "amount": 1000, // Le montant total payé sous forme de nombre entier (ex: 1000)
  "transactionId": "ID/Référence de transaction Mobile Money/MTN/Moov (ex: BJ6600100100000104759707)",
  "studentName": "Nom de l'étudiant figurant sur la quittance (ex: Ange HLEKPE)",
  "date": "Date de la quittance (ex: 16/04/2026)",
  "qrUrl": "URL de vérification ou QR code s'il est textuellement présent sur le reçu"
}
Rends uniquement le JSON brut, sans balises markdown de bloc de code (pas de \`\`\`json).`;

      const geminiPayload = {
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: fileMimeType,
                  data: base64Data
                }
              },
              {
                text: prompt
              }
            ]
          }
        ]
      };

      const geminiResponse = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(geminiPayload)
      });

      if (!geminiResponse.ok) {
        const errorData = await geminiResponse.text();
        throw new Error(`Erreur API Gemini (${geminiResponse.status}) : ${errorData}`);
      }

      const geminiJson = await geminiResponse.json();
      let responseText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!responseText) {
        throw new Error("Gemini n'a renvoyé aucun texte ou la structure est inattendue.");
      }

      // Nettoyage et parsing du JSON renvoyé par Gemini
      responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      let parsedData = {};
      try {
        parsedData = JSON.parse(responseText);
      } catch (err) {
        console.error("Erreur de parsing JSON de la réponse de Gemini :", responseText);
        throw new Error("Impossible d'interpréter les données renvoyées par le moteur d'analyse IA.");
      }

      console.log("Données extraites :", parsedData);

      // Si un QR URL a été détecté dans le PDF, on l'utilise en priorité
      if (!qrUrl && parsedData.qrUrl) {
        qrUrl = parsedData.qrUrl;
      }

      // 7. Contrôles de Sécurité Anti-Fraude
      
      // A. Validation de l'origine du QR Code / URL de vérification
      if (qrUrl) {
        const allowedDomain = "equittancetresor.finances.bj";
        if (!qrUrl.includes(allowedDomain)) {
          return new Response(JSON.stringify({
            verified: false,
            confidence: 1.0,
            message: "Fraude détectée : Le QR code / URL de vérification pointe vers un site non officiel ou frauduleux !",
            data: parsedData
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }

      // B. Validation de concordance d'identité avec l'application
      if (studentNameFromApp && parsedData.studentName) {
        const cleanName = (name) => name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const appNameClean = cleanName(studentNameFromApp);
        const receiptNameClean = cleanName(parsedData.studentName);

        const appNameParts = appNameClean.split(/\s+/).filter(p => p.length > 2);
        const nameMatches = appNameParts.some(part => receiptNameClean.includes(part));

        if (!nameMatches) {
          return new Response(JSON.stringify({
            verified: false,
            confidence: 0.95,
            message: `Le nom sur la quittance (${parsedData.studentName}) ne correspond pas à l'étudiant connecté (${studentNameFromApp}).`,
            data: parsedData
          }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }

      // C. Validation croisée optionnelle avec le site du Trésor Public du Bénin
      let treasuryVerified = false;
      if (qrUrl) {
        try {
          const treasuryHtml = await fetchTreasuryPage(qrUrl);
          if (treasuryHtml) {
            const verificationPrompt = `Tu es un expert en sécurité financière. Voici le code source HTML de la page de vérification officielle du Trésor Public du Bénin :
            
--- COMMENCEMENT HTML ---
${treasuryHtml.substring(0, 12000)}
--- FIN HTML ---

Et voici les données extraites du fichier de l'étudiant :
- Numéro quittance : ${parsedData.quittanceNumber}
- Montant déclaré : ${parsedData.amount} FCFA
- Référence transaction : ${parsedData.transactionId}

Vérifies si cette transaction est réelle, valide et correspond EXACTEMENT à la somme déclarée.
Réponds uniquement avec ce format JSON brut :
{
  "match": true, // true si le montant et les références concordent, false sinon
  "realAmount": 1000 // Le montant réel trouvé sur le site de l'état
}`;

            const checkResponse = await fetch(geminiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: verificationPrompt }] }]
              })
            });

            if (checkResponse.ok) {
              const checkJson = await checkResponse.json();
              let checkText = checkJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
              checkText = checkText.replace(/```json/g, "").replace(/```/g, "").trim();
              const valJson = JSON.parse(checkText);

              if (valJson.match === true) {
                treasuryVerified = true;
                console.log("Validation croisée avec le Trésor Public réussie !");
              } else {
                return new Response(JSON.stringify({
                  verified: false,
                  confidence: 1.0,
                  message: `Fraude détectée : Le montant réel sur le site officiel du Trésor est de ${valJson.realAmount} FCFA, mais le reçu déclare ${parsedData.amount} FCFA.`,
                  data: parsedData
                }), {
                  headers: { "Content-Type": "application/json", ...corsHeaders }
                });
              }
            }
          }
        } catch (err) {
          console.error("Échec de la validation croisée Trésor :", err);
          // On ne bloque pas si le serveur gouvernemental est indisponible
        }
      }

      // Si toutes les étapes passent, le reçu est validé !
      return new Response(JSON.stringify({
        verified: true,
        confidence: treasuryVerified ? 1.0 : 0.85,
        message: treasuryVerified 
          ? "Reçu validé avec succès (Vérification croisée Trésor validée)." 
          : "Reçu validé par analyse optique intelligente.",
        data: parsedData
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });

    } catch (error) {
      console.error("Erreur serveur interne :", error);
      return new Response(JSON.stringify({
        verified: false,
        message: `Erreur interne de traitement : ${error.message}`
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }
};

/**
 * Extrait l'URL de vérification du Trésor Public depuis un fichier PDF (recherche textuelle/binaire)
 */
function extractQrUrlFromPdf(arrayBuffer) {
  try {
    const decoder = new TextDecoder("utf-8");
    const content = decoder.decode(arrayBuffer);
    const regex = /(https:\/\/equittancetresor\.finances\.bj:9051\/paiement-efc\/\?[^\s"'>\)]+)/g;
    const matches = content.match(regex);
    if (matches && matches.length > 0) {
      return matches[0].split(/[\\)"]/)[0];
    }
  } catch (e) {
    console.error("Erreur lors de la recherche de l'URL dans le PDF :", e);
  }
  return null;
}

/**
 * Convertit un ArrayBuffer en chaîne Base64 compatible
 */
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Effectue la requête GET vers le site officiel du Trésor Public
 */
async function fetchTreasuryPage(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3"
      }
    });
    if (response.ok) {
      return await response.text();
    }
  } catch (e) {
    console.error("Impossible de récupérer la page de validation :", e);
  }
  return null;
}

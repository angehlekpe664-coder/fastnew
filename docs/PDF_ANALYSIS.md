# Alternatives gratuites pour l'analyse de PDF / quittances

## ✅ Solution implémentée (100 % gratuite)

| Outil | Rôle | Coût |
|---|---|---|
| **pdf-parse** | Extraction texte des PDF natifs | Gratuit |
| **jsQR + pngjs** | Lecture QR Code sur images | Gratuit |
| **Regex métier** | Montant, date, n° quittance, canal MTN/Moov | Gratuit |
| **Validation Trésor** | Vérification domaine `equittancetresor.finances.bj` | Gratuit |

Pipeline : PDF → texte → regex + QR → règles admin configurables.

**Limite** : PDF scannés (image seule) sans texte extractible → OCR nécessaire.

---

## Alternatives gratuites si besoin d'OCR

### 1. Tesseract.js (recommandé)
- OCR open-source, fonctionne en Node.js
- Gratuit, sans limite d'appels
- `npm install tesseract.js`
- Bon pour photos de quittances floues

### 2. Ollama (local)
- Modèles vision (LLaVA, etc.) en local
- 100 % gratuit si vous avez un PC/serveur
- Aucune donnée envoyée à un tiers
- Idéal pour extraction structurée JSON

### 3. Hugging Face Inference API
- Tier gratuit limité (quelques milliers req/mois)
- Modèles : `naver-clova-ix/donut-base`, `microsoft/trocr-base-printed`
- Bon pour documents structurés

### 4. Google Document AI
- ❌ Payant après quota minimal

### 5. Gemini / OpenAI
- ❌ Freemium limité, pas « totalement gratuit »

### 6. API Trésor Public (futur)
- ✅ Meilleure option si disponible
- Vérification directe via URL QR → source officielle
- Architecture déjà prévue (`qrUrl` + domaine Trésor)

---

## Recommandation

```
PDF texte natif  → pdf-parse + regex (actuel)
PDF scanné       → + Tesseract.js
Cas complexe     → + Ollama local (optionnel)
Production max   → API Trésor Public quand disponible
```

Pour activer Tesseract plus tard, ajoutez dans `receipt-parser.service.ts` :

```typescript
import Tesseract from "tesseract.js";
const { data: { text } } = await Tesseract.recognize(buffer, "fra");
```

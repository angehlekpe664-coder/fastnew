# UniPay TP — Vérification des quittances

## Architecture

```
frontend/   → Étudiants (port 5173) — sans lien admin
admin/      → Administration (port 5174) — Supabase Auth
backend/    → API Express (port 4000)
supabase/   → Migrations SQL + guide setup
```

## Démarrage

### 1. Supabase
Suivez **`supabase/SETUP.md`** (projet, SQL, bucket, compte admin).

### 2. Backend
```bash
cd backend && npm install
cp .env.example .env   # renseigner SUPABASE_*
npm run dev
```

### 3. Frontend étudiant
```bash
cd frontend && npm run dev
```
→ http://localhost:5173

### 4. Console admin (séparée)
```bash
cd admin && npm run dev
```
→ http://localhost:5174

## Formulaire étudiant (5 champs + quittance)

| Champ | Exemple |
|---|---|
| Nom | HLEKPE |
| Prénom | Ange |
| Matricule | 22A045 |
| Filière | MIA |
| Code TP | PHY1121 |
| + Quittance | PDF ou image |

## Analyse PDF — 100 % gratuit

Voir **`docs/PDF_ANALYSIS.md`**

Stack actuelle : `pdf-parse` + `jsQR` + regex (aucune API payante).

Alternatives : Tesseract.js, Ollama local, API Trésor Public (futur).

## Déploiement

| App | Hébergeur |
|---|---|
| frontend | Vercel |
| admin | Vercel (domaine séparé ex: admin.unipay.uac.bj) |
| backend | Render / Railway |
| BDD + Auth | Supabase |

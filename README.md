# UniPay Vérification TP

Plateforme web de **vérification des quittances de paiement** des Travaux Pratiques (TP) — UAC, Faculté des Sciences.

> Les étudiants paient sur le portail du **Trésor Public**. Cette plateforme ne réalise **aucun paiement** : elle vérifie l'authenticité des quittances et enregistre les validations.

## Stack

| Couche | Technologies |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Backend | Node.js, Express, Prisma |
| Base de données | SQLite (dev) / PostgreSQL (prod) |
| Auth admin | JWT |
| IA / OCR | Google Gemini (optionnel) |

## Démarrage rapide

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma db push
npm run db:seed
npm run dev
```

API : **http://localhost:4000**

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App : **http://localhost:5173**

### Identifiants admin par défaut

- Email : `admin@uac.bj`
- Mot de passe : `Admin@2026!`

## Parcours étudiant (sans compte)

1. Accueil → **Vérifier ma quittance**
2. Formulaire : nom, prénom, faculté, département, filière, niveau + fichier PDF/image
3. Analyse automatique (OCR, QR Code, règles métier)
4. Résultat :
   - ✅ Identifiant de validation unique
   - ❌ Motif du rejet (enregistré pour les admins)

## Espace administrateur

- Connexion JWT sécurisée
- Tableau de bord (stats, taux de validation, répartition par filière)
- Liste des étudiants validés + recherche
- Historique des échecs avec motifs
- Paramètres de validation modifiables sans code
- Export CSV / Excel / PDF

## Production PostgreSQL

```bash
docker compose up -d
```

Puis dans `backend/prisma/schema.prisma`, remplacez :

```prisma
provider = "postgresql"
```

Et `.env` :

```
DATABASE_URL="postgresql://unipay:unipay_secret@localhost:5433/unipay_verify"
```

## Déploiement (Vercel + Render)

- **Frontend** → Vercel (dossier `frontend`, build `npm run build`, output `dist`)
- **Backend** → Render (dossier `backend`, start `npm start`)
- Ajoutez le domaine Vercel dans Firebase/ CORS (`CORS_ORIGIN`)
- Variables : `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`

## IA Gemini (optionnel)

Ajoutez `GEMINI_API_KEY` dans `backend/.env` pour activer l'OCR réel.
Sans clé, le mode simulation locale est utilisé pour les tests.

## Ancienne app Flutter

Le code Flutter/Firebase d'origine reste à la racine (`lib/`, `web_app/`).
La nouvelle plateforme officielle est dans `frontend/` + `backend/`.

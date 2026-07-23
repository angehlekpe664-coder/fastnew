# Configuration Supabase — UniPay TP

## Clés API : ce qui suffit où

| Clé | Où | Rôle |
|-----|-----|------|
| **Publishable** (`sb_publishable_...`) | `admin/.env` uniquement | Connexion admin (Supabase Auth) |
| **Publishable** | `backend/.env` → `SUPABASE_ANON_KEY` | Vérifier le JWT admin sur `/api/admin/*` |
| **Secret / service_role** (`sb_secret_...`) | `backend/.env` **uniquement** | Écritures BDD, Storage, bypass RLS |

**La clé publishable seule ne suffit pas** pour faire tourner le backend (vérifications étudiantes, upload PDF, exports).

## 1. Variables d'environnement (déjà préremplies localement)

### Backend (`backend/.env`)

```env
SUPABASE_URL=https://sxpowjlpeldffyyyowie.supabase.co
SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...   ← À COMPLÉTER
PORT=4000
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
UPLOAD_DIR=./uploads
```

Récupérer la clé secrète : **Dashboard → Settings → API → Secret key** (ou `service_role`).

### Admin (`admin/.env`)

```env
VITE_SUPABASE_URL=https://sxpowjlpeldffyyyowie.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
VITE_API_URL=
```

### Frontend public (`frontend/.env`)

```env
VITE_API_URL=
```

Le site public **n'a pas besoin** de clés Supabase (tout passe par le backend).

## 2. Migrations SQL

Dans **SQL Editor**, exécuter dans l'ordre :

1. `supabase/migrations/001_initial.sql` — tables, RLS, catalogue TP
2. `supabase/migrations/002_storage_bucket.sql` — bucket privé `quittances`
3. `supabase/migrations/003_phy1322_only.sql` — activer uniquement PHY1322 + règles Trésor

Vérification rapide : `GET /rest/v1/tp_catalog?select=code&limit=1` doit renvoyer des codes TP.

## 3. Compte administrateur

1. **Authentication → Users → Add user** — email + mot de passe fort
2. Copier l'**UUID** de l'utilisateur
3. SQL Editor :

```sql
INSERT INTO admin_profiles (id, nom, role)
VALUES ('UUID-DE-L-ADMIN', 'Administrateur UniPay', 'admin')
ON CONFLICT (id) DO NOTHING;
```

## 4. Sécurité

- **Ne jamais** mettre `SUPABASE_SERVICE_ROLE_KEY` dans le frontend ni l'app admin
- Les fichiers `.env` sont dans `.gitignore` — ne pas les commiter
- Si `backend/.env` a déjà été poussé sur Git : retirer du suivi (`git rm --cached backend/.env`) et **rotater** la clé secrète dans le Dashboard
- Rotation recommandée si une clé a été partagée en clair (chat, issue, etc.)

## 5. Test

```bash
# Backend
cd backend && npm run dev
curl http://localhost:4000/api/health
# supabase.ready doit être true une fois la clé secrète renseignée

# Admin
cd admin && npm run dev   # http://localhost:5174

# Frontend public
cd frontend && npm run dev   # http://localhost:5173
```

## 6. Auth

- **Étudiants** : aucun compte Supabase, formulaire public → API backend
- **Admins** : Supabase Auth via l'app admin séparée (port 5174)
- Le backend vérifie le JWT + la table `admin_profiles` sur chaque route `/api/admin/*`

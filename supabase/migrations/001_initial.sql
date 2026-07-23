-- UniPay TP — Schéma Supabase
-- Exécuter dans : Supabase Dashboard → SQL Editor

-- Profils admin (liés à auth.users)
CREATE TABLE IF NOT EXISTS admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL DEFAULT 'Administrateur',
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Étudiants validés
CREATE TABLE IF NOT EXISTS validated_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  matricule TEXT NOT NULL,
  filiere TEXT NOT NULL,
  code_tp TEXT NOT NULL,
  tp_title TEXT NOT NULL,
  numero_quittance TEXT NOT NULL UNIQUE,
  reference_paiement TEXT,
  montant INTEGER NOT NULL DEFAULT 0,
  date_paiement TIMESTAMPTZ,
  date_verification TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fichier_quittance TEXT,
  validation_id TEXT NOT NULL UNIQUE,
  statut TEXT NOT NULL DEFAULT 'VALIDE',
  confidence REAL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validated_matricule ON validated_students(matricule);
CREATE INDEX IF NOT EXISTS idx_validated_filiere ON validated_students(filiere);
CREATE INDEX IF NOT EXISTS idx_validated_code_tp ON validated_students(code_tp);
CREATE INDEX IF NOT EXISTS idx_validated_validation_id ON validated_students(validation_id);

-- Vérifications échouées
CREATE TABLE IF NOT EXISTS failed_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  matricule TEXT,
  filiere TEXT,
  code_tp TEXT,
  motif TEXT NOT NULL,
  fichier TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_failed_created ON failed_verifications(created_at DESC);

-- Paramètres de validation (modifiables par admin)
CREATE TABLE IF NOT EXISTS validation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  label TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Catalogue TP (admin peut étendre)
CREATE TABLE IF NOT EXISTS tp_catalog (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  filiere TEXT NOT NULL,
  montant INTEGER NOT NULL DEFAULT 2500,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Données TP initiales
INSERT INTO tp_catalog (code, title, filiere, montant) VALUES
  ('PHY1121', 'Physique Expérimental', 'MIA', 2500),
  ('PHY1322', 'Mécanique Expérimental', 'MIA', 2500),
  ('INF1422', 'LaTeX', 'MIA', 1500),
  ('INF1421', 'Python & Scilab', 'MIA', 1500),
  ('PHY1225-1', 'Mécanique et Électricité', 'PC', 2500),
  ('PHY1225-2', 'Optique', 'PC', 2500),
  ('CHM1226-1', 'Chimie Générale', 'PC', 2500),
  ('CHM1226-2', 'Chimie Minérale', 'PC', 2500),
  ('CHM1226-3', 'Chimie Organique', 'PC', 2500),
  ('INF1120', 'Informatique', 'PC', 1500),
  ('CHM1321', 'Chimie Organique Descriptif', 'PC', 2500),
  ('CHM1323', 'Chimie des Matériaux', 'PC', 2500),
  ('CHM1325', 'Chimie des Solutions', 'PC', 2500),
  ('PHY1426-2', 'Électronique', 'PC', 3000),
  ('PHY1426-3', 'Thermodynamique', 'PC', 3000)
ON CONFLICT (code) DO NOTHING;

-- Paramètres par défaut
INSERT INTO validation_settings (key, value, label, category) VALUES
  ('expectedAmount', '2500', 'Montant attendu (FCFA)', 'validation'),
  ('academicYear', '"2025-2026"', 'Année académique', 'validation'),
  ('treasuryAccountNumber', '""', 'N° compte Trésor', 'validation'),
  ('paymentTitle', '"FAST/PRODUITS ACCESSOIRES"', 'Intitulé paiement', 'validation'),
  ('allowedDateFrom', 'null', 'Date début', 'validation'),
  ('allowedDateTo', 'null', 'Date fin', 'validation'),
  ('treasuryDomain', '"equittancetresor.finances.bj"', 'Domaine QR Trésor', 'validation'),
  ('requireQrCode', 'false', 'QR obligatoire', 'validation'),
  ('requireOfficialLogo', 'false', 'Logo officiel obligatoire', 'validation'),
  ('customRules', '[]', 'Règles personnalisées', 'validation')
ON CONFLICT (key) DO NOTHING;

-- Bucket Storage pour les quittances (à créer aussi via Dashboard → Storage)
-- Nom du bucket : quittances (public: false)

-- RLS : lecture publique interdite, backend utilise service_role
ALTER TABLE validated_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tp_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- Politique : service role bypass RLS automatiquement
-- Pour admin authentifié via JWT Supabase (optionnel futur) :
CREATE POLICY "Admins read validated" ON validated_students
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

CREATE POLICY "Admins read failures" ON failed_verifications
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

CREATE POLICY "Admins manage settings" ON validation_settings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

CREATE POLICY "Public read tp catalog" ON tp_catalog
  FOR SELECT TO anon, authenticated
  USING (actif = true);

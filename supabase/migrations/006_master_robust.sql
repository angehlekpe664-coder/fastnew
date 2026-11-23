-- UniPay TP — Migration Maîtresse Idempotente & Robuste
-- À exécuter dans : Supabase Dashboard → SQL Editor (ne produit aucune erreur si relancé)

-- 1. Profils admin
CREATE TABLE IF NOT EXISTS admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL DEFAULT 'Administrateur',
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Étudiants validés
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

-- 3. Vérifications échouées
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

-- 4. Paramètres de validation
CREATE TABLE IF NOT EXISTS validation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  label TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Catalogue TP
CREATE TABLE IF NOT EXISTS tp_catalog (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  filiere TEXT NOT NULL,
  montant INTEGER NOT NULL DEFAULT 1000,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Base d'Étudiants Officielle
CREATE TABLE IF NOT EXISTS official_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricule TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  filiere TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_official_students_matricule ON official_students(matricule);
CREATE INDEX IF NOT EXISTS idx_official_students_filiere ON official_students(filiere);

-- Activation de la sécurité RLS sur toutes les tables
ALTER TABLE validated_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tp_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE official_students ENABLE ROW LEVEL SECURITY;

-- Politiques RLS sécurisées (idempotentes)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins read validated" ON validated_students;
  CREATE POLICY "Admins read validated" ON validated_students
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

  DROP POLICY IF EXISTS "Admins read failures" ON failed_verifications;
  CREATE POLICY "Admins read failures" ON failed_verifications
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

  DROP POLICY IF EXISTS "Admins manage settings" ON validation_settings;
  CREATE POLICY "Admins manage settings" ON validation_settings
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

  DROP POLICY IF EXISTS "Public read tp catalog" ON tp_catalog;
  CREATE POLICY "Public read tp catalog" ON tp_catalog
    FOR SELECT TO anon, authenticated
    USING (actif = true);

  DROP POLICY IF EXISTS "Admins manage official_students" ON official_students;
  CREATE POLICY "Admins manage official_students" ON official_students
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));
END $$;

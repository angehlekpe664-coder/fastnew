-- UniPay TP — Migration Supabase 005
-- Exécuter dans : Supabase Dashboard → SQL Editor

-- Table de la Base d'Étudiants Officielle
CREATE TABLE IF NOT EXISTS official_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricule TEXT NOT NULL UNIQUE,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  filiere TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexation pour des requêtes ultra-rapides
CREATE INDEX IF NOT EXISTS idx_official_students_matricule ON official_students(matricule);
CREATE INDEX IF NOT EXISTS idx_official_students_filiere ON official_students(filiere);

-- Sécurité Row Level Security (RLS)
ALTER TABLE official_students ENABLE ROW LEVEL SECURITY;

-- Accès réservé aux administrateurs
CREATE POLICY "Admins manage official_students" ON official_students
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()));

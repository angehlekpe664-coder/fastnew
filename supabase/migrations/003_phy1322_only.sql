-- Activer uniquement PHY1322 pour le lancement
UPDATE tp_catalog SET actif = false;

INSERT INTO tp_catalog (code, title, filiere, montant, actif) VALUES
  ('PHY1322', 'Mécanique Expérimental', 'MIA', 1000, true)
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  filiere = EXCLUDED.filiere,
  montant = EXCLUDED.montant,
  actif = true;

-- Règles de validation alignées sur le format quittance Trésor
INSERT INTO validation_settings (key, value, label, category) VALUES
  ('expectedAmount', '1000', 'Montant attendu par défaut (FCFA)', 'validation'),
  ('academicYear', '"2025-2026"', 'Année académique', 'validation'),
  ('requireQrCode', 'true', 'QR Code Trésor obligatoire', 'validation'),
  ('requireOfficialLogo', 'true', 'Mentions Trésor obligatoires', 'validation'),
  ('requireTpCodeMatch', 'true', 'Code TP sur quittance obligatoire', 'validation'),
  ('requireYearMatch', 'true', 'Année quittance dans période académique', 'validation'),
  ('paymentTitle', '"FAST/PRODUITS ACCESSOIRES"', 'Intitulé paiement', 'validation'),
  ('treasuryDomain', '"equittancetresor.finances.bj"', 'Domaine QR Trésor', 'validation')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

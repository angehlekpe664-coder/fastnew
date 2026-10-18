-- Catalogue de lancement MIA : conserver PHY1322 et activer les TP Informatique.
-- Cette migration est additive : ne modifiez pas 003_phy1322_only.sql, qui
-- représente le périmètre initial du lancement.

INSERT INTO tp_catalog (code, title, filiere, montant, actif)
VALUES
  ('PHY1322', 'Mécanique Expérimental', 'MIA', 1000, true),
  ('INF1422', 'LaTeX', 'MIA', 1500, true),
  ('INF1421', 'Python & Scilab', 'MIA', 1500, true)
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  filiere = EXCLUDED.filiere,
  montant = EXCLUDED.montant,
  actif = true;

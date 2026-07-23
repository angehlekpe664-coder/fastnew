-- Bucket privé pour les quittances PDF (backend via service_role)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'quittances',
  'quittances',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Aucune policy publique : seul service_role (backend) écrit/lit les fichiers.

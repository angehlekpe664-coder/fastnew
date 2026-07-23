-- Active Realtime sur les rejets (admin connecté via Supabase Auth)
ALTER TABLE failed_verifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE failed_verifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

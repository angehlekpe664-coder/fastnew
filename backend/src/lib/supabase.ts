import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _adminClient: SupabaseClient | null = null;

function getServiceRoleKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    ""
  );
}

/** Client serveur — service_role UNIQUEMENT, jamais exposé au frontend */
export function getSupabaseAdmin(): SupabaseClient {
  if (_adminClient) return _adminClient;

  const url = process.env.SUPABASE_URL;
  const key = getServiceRoleKey();

  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SECRET_KEY) manquant dans backend/.env — " +
        "récupérez la clé secrète dans Supabase Dashboard → Settings → API. " +
        "Ne jamais la mettre dans le frontend."
    );
  }

  _adminClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _adminClient;
}

/** Client anon/publishable — vérification JWT utilisateur admin */
export function getSupabaseAnon(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_URL et SUPABASE_ANON_KEY requis.");
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && getServiceRoleKey());
}

export function isSupabaseClientConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

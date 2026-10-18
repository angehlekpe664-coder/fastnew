import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config.js";

let _adminClient: SupabaseClient | null = null;

function getServiceRoleKey(): string {
  return config.supabase.serviceRoleKey;
}

/** Client serveur — service_role UNIQUEMENT, jamais exposé au frontend */
export function getSupabaseAdmin(): SupabaseClient {
  if (_adminClient) return _adminClient;

  const url = config.supabase.url;
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
  const url = config.supabase.url;
  const key = config.supabase.anonKey;

  if (!url || !key) {
    throw new Error("SUPABASE_URL et SUPABASE_ANON_KEY requis.");
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function isSupabaseConfigured(): boolean {
  return Boolean(config.supabase.url && getServiceRoleKey());
}

export function isSupabaseClientConfigured(): boolean {
  return Boolean(config.supabase.url && config.supabase.anonKey);
}

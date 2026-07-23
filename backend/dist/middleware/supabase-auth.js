import { getSupabaseAdmin, getSupabaseAnon, isSupabaseClientConfigured } from "../lib/supabase.js";
export async function requireSupabaseAdmin(req, res, next) {
    if (!isSupabaseClientConfigured()) {
        return res.status(503).json({ error: "Supabase non configuré côté serveur." });
    }
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Authentification requise." });
    }
    const token = header.slice(7);
    try {
        const { data, error } = await getSupabaseAnon().auth.getUser(token);
        if (error || !data.user) {
            return res.status(401).json({ error: "Session invalide ou expirée." });
        }
        const { data: profile, error: profileError } = await getSupabaseAdmin()
            .from("admin_profiles")
            .select("role, nom")
            .eq("id", data.user.id)
            .maybeSingle();
        if (profileError || !profile) {
            return res.status(403).json({ error: "Accès réservé aux administrateurs." });
        }
        req.admin = {
            id: data.user.id,
            email: data.user.email ?? "",
            role: profile.role,
        };
        next();
    }
    catch {
        return res.status(503).json({ error: "Impossible de vérifier l'authentification." });
    }
}

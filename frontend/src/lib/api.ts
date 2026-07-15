const API_BASE = import.meta.env.VITE_API_URL ?? "";

export type VerifyPayload = {
  nom: string;
  prenom: string;
  faculte: string;
  departement: string;
  filiere: string;
  niveau: string;
  matiere?: string;
  quittance: File;
};

export type VerifySuccess = {
  success: true;
  message: string;
  validationId: string;
  student: {
    nom: string;
    prenom: string;
    filiere: string;
    niveau: string;
    numeroQuittance: string;
    montant: number;
    dateVerification: string;
  };
};

export type VerifyFailure = {
  success: false;
  motif: string;
};

export async function verifyQuittance(data: VerifyPayload): Promise<VerifySuccess | VerifyFailure> {
  const form = new FormData();
  form.append("nom", data.nom);
  form.append("prenom", data.prenom);
  form.append("faculte", data.faculte);
  form.append("departement", data.departement);
  form.append("filiere", data.filiere);
  form.append("niveau", data.niveau);
  if (data.matiere) form.append("matiere", data.matiere);
  form.append("quittance", data.quittance);

  const res = await fetch(`${API_BASE}/api/verify`, { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok) return { success: false, motif: json.motif || json.error || "Erreur de vérification." };
  return json;
}

export async function adminLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Connexion impossible");
  return json as { token: string; admin: { nom: string; email: string } };
}

function authHeaders() {
  const token = localStorage.getItem("admin_token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Erreur API");
  return json;
}

export function downloadExport(format: "csv" | "xlsx" | "pdf") {
  const token = localStorage.getItem("admin_token");
  window.open(`${API_BASE}/api/admin/export/${format}?token=${token}`, "_blank");
}

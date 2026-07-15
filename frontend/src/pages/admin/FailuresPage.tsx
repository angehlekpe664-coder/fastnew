import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { adminFetch } from "@/lib/api";
import { formatDate } from "@/lib/utils";

type Failure = {
  id: string;
  nom: string;
  prenom: string;
  filiere?: string;
  motif: string;
  fichier?: string;
  createdAt: string;
};

export default function FailuresPage() {
  const navigate = useNavigate();
  const [failures, setFailures] = useState<Failure[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    const load = () =>
      adminFetch<Failure[]>(`/api/admin/failures?q=${encodeURIComponent(q)}`)
        .then(setFailures)
        .catch(() => navigate("/admin/login"));
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [q, navigate]);

  const logout = () => {
    localStorage.removeItem("admin_token");
    navigate("/admin/login");
  };

  return (
    <AdminLayout onLogout={logout}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Vérifications échouées</h1>
          <p className="text-muted">Historique des rejets avec motifs</p>
        </div>
        <Input className="max-w-sm" placeholder="Rechercher..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="space-y-3">
        {failures.map((f) => (
          <Card key={f.id}>
            <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div>
                <div className="font-semibold">{f.prenom} {f.nom}</div>
                <div className="text-sm text-muted">{f.filiere ?? "—"} • {formatDate(f.createdAt)}</div>
                <div className="mt-2 text-sm">{f.motif}</div>
              </div>
              <Badge variant="danger">REJETÉ</Badge>
            </CardContent>
          </Card>
        ))}
        {!failures.length && (
          <Card><CardHeader><CardTitle className="text-muted">Aucun échec enregistré</CardTitle></CardHeader></Card>
        )}
      </div>
    </AdminLayout>
  );
}

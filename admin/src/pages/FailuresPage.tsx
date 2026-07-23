import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/admin-ui";
import { formatDate } from "@/lib/utils";

type Row = {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
  filiere: string;
  code_tp: string;
  motif: string;
  created_at: string;
};

export default function FailuresPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      adminFetch<Row[]>(`/api/admin/failures?q=${encodeURIComponent(q)}`).then(setRows).catch(console.error);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Vérifications échouées" description={`${rows.length} rejet(s) récent(s)`} />

      <Input className="mb-4 max-w-xs bg-secondary" placeholder="Rechercher..." value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="glass-panel rounded-xl p-4 transition hover:border-danger/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="font-semibold text-foreground">
                  {r.prenom} {r.nom}
                </span>
                <span className="ml-2 font-mono text-xs text-muted">{r.matricule}</span>
                <p className="mt-1 text-sm text-danger/90">{r.motif}</p>
                <p className="text-xs text-muted">
                  {r.filiere} · {r.code_tp} · {formatDate(r.created_at)}
                </p>
              </div>
              <Badge variant="danger">REJETÉ</Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

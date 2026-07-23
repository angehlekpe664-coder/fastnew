import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { adminFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/admin-ui";
import { formatAmount, formatDate } from "@/lib/utils";

type Row = {
  validation_id: string;
  nom: string;
  prenom: string;
  matricule: string;
  filiere: string;
  code_tp: string;
  tp_title: string;
  numero_quittance: string;
  montant: number;
  date_verification: string;
  statut: string;
};

type TpStat = { code: string; title: string; count: number };

export default function StudentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<Row[]>([]);
  const [byTp, setByTp] = useState<TpStat[]>([]);
  const [q, setQ] = useState("");
  const codeTp = searchParams.get("codeTp") ?? "";

  useEffect(() => {
    adminFetch<{ byTp: TpStat[] }>("/api/admin/stats").then((s) => setByTp(s.byTp)).catch(console.error);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (codeTp) params.set("codeTp", codeTp);
      adminFetch<Row[]>(`/api/admin/students?${params}`).then(setRows).catch(console.error);
    }, 200);
    return () => clearTimeout(t);
  }, [q, codeTp]);

  const filterTp = (code: string) => {
    if (code) setSearchParams({ codeTp: code });
    else setSearchParams({});
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Quittances validées"
        description={`${rows.length} résultat(s)${codeTp ? ` — TP ${codeTp}` : ""}`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => filterTp("")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              !codeTp ? "bg-primary/20 text-primary" : "bg-secondary text-muted hover:text-foreground"
            }`}
          >
            Tous
          </button>
          {byTp.map((tp) => (
            <button
              key={tp.code}
              type="button"
              onClick={() => filterTp(tp.code)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                codeTp === tp.code ? "bg-primary/20 text-primary" : "bg-secondary text-muted hover:text-foreground"
              }`}
            >
              {tp.code} ({tp.count})
            </button>
          ))}
        </div>
        <Input className="ml-auto max-w-xs bg-secondary" placeholder="Rechercher..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-secondary/80 text-muted">
            <tr>
              <th className="p-3 font-medium">Étudiant</th>
              <th className="p-3 font-medium">Matricule</th>
              <th className="p-3 font-medium">TP</th>
              <th className="p-3 font-medium">Quittance</th>
              <th className="p-3 font-medium">Montant</th>
              <th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.validation_id} className="bg-card/50 transition hover:bg-card-hover">
                <td className="p-3">
                  <div className="font-medium text-foreground">
                    {r.prenom} {r.nom}
                  </div>
                  <div className="text-xs text-muted">{r.filiere}</div>
                </td>
                <td className="p-3 font-mono text-xs text-muted">{r.matricule}</td>
                <td className="p-3">
                  <div className="font-mono text-xs text-accent">{r.code_tp}</div>
                  <div className="text-xs text-muted">{r.tp_title}</div>
                </td>
                <td className="p-3 font-mono text-xs">{r.numero_quittance}</td>
                <td className="p-3 text-foreground">{formatAmount(r.montant)}</td>
                <td className="p-3 text-xs text-muted">{formatDate(r.date_verification)}</td>
                <td className="p-3">
                  <Badge variant="success">{r.statut}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

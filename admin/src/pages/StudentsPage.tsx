import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { adminFetch, downloadExport } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/admin-ui";
import { formatAmount, formatDate } from "@/lib/utils";
import { Download, FileSpreadsheet, FileText, Trash2, Filter, RefreshCw } from "lucide-react";

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
  const [filieres, setFilieres] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const filiere = searchParams.get("filiere") ?? "";
  const codeTp = searchParams.get("codeTp") ?? "";

  useEffect(() => {
    adminFetch<{ byTp: TpStat[] }>("/api/admin/stats").then((s) => setByTp(s.byTp)).catch(console.error);
    adminFetch<string[]>("/api/admin/filieres").then(setFilieres).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (filiere) params.set("filiere", filiere);
      if (codeTp) params.set("codeTp", codeTp);

      adminFetch<Row[]>(`/api/admin/students?${params}`)
        .then(setRows)
        .catch(console.error)
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [q, filiere, codeTp]);

  const updateFilters = (newFiliere?: string, newTp?: string) => {
    const params = new URLSearchParams(searchParams);
    const fVal = newFiliere !== undefined ? newFiliere : filiere;
    const tpVal = newTp !== undefined ? newTp : codeTp;

    if (fVal) params.set("filiere", fVal);
    else params.delete("filiere");

    if (tpVal) params.set("codeTp", tpVal);
    else params.delete("codeTp");

    setSearchParams(params);
  };

  const handleExport = async (format: "csv" | "xlsx" | "pdf") => {
    try {
      setExporting(format);
      await downloadExport(format, { filiere, codeTp, q });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Échec de l'exportation");
    } finally {
      setExporting(null);
    }
  };

  const handleDeleteStudent = async (validationId: string, name: string) => {
    if (!confirm(`Voulez-vous vraiment révoquer l'attestation de ${name} (${validationId}) ?`)) return;
    try {
      await adminFetch(`/api/admin/students/${validationId}`, { method: "DELETE" });
      setRows((prev) => prev.filter((r) => r.validation_id !== validationId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          title="Étudiants validés"
          description={`${rows.length} étudiant(s) trouvé(s)${filiere ? ` · Filière : ${filiere}` : ""}${
            codeTp ? ` · TP : ${codeTp}` : ""
          }`}
        />

        {/* Boutons d'exportation avec filtres actifs */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("xlsx")}
            disabled={exporting !== null}
            className="gap-1.5"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            {exporting === "xlsx" ? "Export..." : "Excel (XLSX)"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
            disabled={exporting !== null}
            className="gap-1.5"
          >
            <Download className="h-4 w-4 text-blue-500" />
            {exporting === "csv" ? "Export..." : "CSV"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("pdf")}
            disabled={exporting !== null}
            className="gap-1.5"
          >
            <FileText className="h-4 w-4 text-purple-500" />
            {exporting === "pdf" ? "Export..." : "Texte / PDF"}
          </Button>
        </div>
      </div>

      {/* Barre de filtrage combiné (Filière + TP + Recherche) */}
      <div className="mb-5 glass-panel rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
            <Filter className="h-4 w-4 text-primary" /> Filtres :
          </div>

          {/* Filtre par Filière */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Filière :</span>
            <select
              value={filiere}
              onChange={(e) => updateFilters(e.target.value, undefined)}
              className="h-9 rounded-xl border border-border bg-secondary px-3 text-xs font-medium text-foreground outline-none focus:border-primary"
            >
              <option value="">Toutes les filières</option>
              {filieres.map((f) => (
                <option key={f} value={f}>
                  Filière {f}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre par TP */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Code TP :</span>
            <select
              value={codeTp}
              onChange={(e) => updateFilters(undefined, e.target.value)}
              className="h-9 rounded-xl border border-border bg-secondary px-3 text-xs font-medium text-foreground outline-none focus:border-primary"
            >
              <option value="">Tous les TP</option>
              {byTp.map((tp) => (
                <option key={tp.code} value={tp.code}>
                  {tp.code} ({tp.count}) — {tp.title}
                </option>
              ))}
            </select>
          </div>

          {(filiere || codeTp || q) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                setSearchParams({});
              }}
              className="text-xs text-muted hover:text-foreground"
            >
              Réinitialiser
            </Button>
          )}

          <div className="ml-auto min-w-[220px] flex-1 sm:flex-initial">
            <Input
              className="bg-secondary"
              placeholder="Nom, matricule, quittance, ID..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Badges de filtrage rapide par TP */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => updateFilters(filiere, "")}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            !codeTp ? "bg-primary/20 text-primary" : "bg-secondary text-muted hover:text-foreground"
          }`}
        >
          Tous TP
        </button>
        {byTp.map((tp) => (
          <button
            key={tp.code}
            type="button"
            onClick={() => updateFilters(filiere, codeTp === tp.code ? "" : tp.code)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              codeTp === tp.code ? "bg-primary/20 text-primary" : "bg-secondary text-muted hover:text-foreground"
            }`}
          >
            {tp.code} ({tp.count})
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-secondary/80 text-muted">
            <tr>
              <th className="p-3 font-medium">Étudiant</th>
              <th className="p-3 font-medium">Matricule</th>
              <th className="p-3 font-medium">TP & Filière</th>
              <th className="p-3 font-medium">Quittance</th>
              <th className="p-3 font-medium">Montant</th>
              <th className="p-3 font-medium">Date</th>
              <th className="p-3 font-medium">Statut</th>
              <th className="p-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted">
                  <RefreshCw className="mx-auto h-6 w-6 animate-spin text-primary" />
                  <p className="mt-2 text-xs">Chargement de la liste...</p>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted">
                  Aucun étudiant trouvé pour ces filtres.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.validation_id} className="bg-card/50 transition hover:bg-card-hover">
                  <td className="p-3">
                    <div className="font-medium text-foreground">
                      {r.prenom} {r.nom}
                    </div>
                    <div className="font-mono text-[11px] text-muted">{r.validation_id}</div>
                  </td>
                  <td className="p-3 font-mono text-xs text-muted">{r.matricule}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-semibold text-accent">{r.code_tp}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {r.filiere}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted truncate max-w-[200px]">{r.tp_title}</div>
                  </td>
                  <td className="p-3 font-mono text-xs">{r.numero_quittance}</td>
                  <td className="p-3 text-foreground font-semibold">{formatAmount(r.montant)}</td>
                  <td className="p-3 text-xs text-muted">{formatDate(r.date_verification)}</td>
                  <td className="p-3">
                    <Badge variant="success">{r.statut}</Badge>
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteStudent(r.validation_id, `${r.prenom} ${r.nom}`)}
                      className="h-8 w-8 p-0 text-muted hover:text-danger"
                      title="Révoquer / Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

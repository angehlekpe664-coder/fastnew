import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { adminFetch, downloadExport } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/admin-ui";
import { formatAmount, formatDate } from "@/lib/utils";
import { Download, FileSpreadsheet, FileText, Trash2, Filter, RefreshCw, Users, CheckCircle2 } from "lucide-react";

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
    <div className="animate-fade-in space-y-5">
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
            className="h-10 border-emerald-500/30 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 gap-1.5 font-medium"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {exporting === "xlsx" ? "Export..." : "Excel (XLSX)"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
            disabled={exporting !== null}
            className="h-10 border-sky-500/30 bg-sky-50/50 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/30 dark:text-sky-300 gap-1.5 font-medium"
          >
            <Download className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            {exporting === "csv" ? "Export..." : "CSV"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("pdf")}
            disabled={exporting !== null}
            className="h-10 border-purple-500/30 bg-purple-50/50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/30 dark:text-purple-300 gap-1.5 font-medium"
          >
            <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            {exporting === "pdf" ? "Export..." : "Texte / PDF"}
          </Button>
        </div>
      </div>

      {/* Barre de filtrage combiné (Filière + TP + Recherche) */}
      <div className="glass-panel rounded-2xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
            <Filter className="h-4 w-4" /> FILTRES D'AFFICHAGE :
          </div>

          {/* Filtre par Filière */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted">Filière :</span>
            <select
              value={filiere}
              onChange={(e) => updateFilters(e.target.value, undefined)}
              className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground outline-none focus:border-primary shadow-xs"
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
            <span className="text-xs font-medium text-muted">Code TP :</span>
            <select
              value={codeTp}
              onChange={(e) => updateFilters(undefined, e.target.value)}
              className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground outline-none focus:border-primary shadow-xs"
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
              className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400"
            >
              Réinitialiser
            </Button>
          )}

          <div className="ml-auto min-w-[220px] flex-1 sm:flex-initial">
            <Input
              className="bg-card shadow-xs"
              placeholder="Rechercher nom, matricule, ID..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Badges de filtrage rapide par TP */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => updateFilters(filiere, "")}
          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition shadow-xs ${
            !codeTp ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40" : "bg-card border border-border text-muted hover:text-foreground"
          }`}
        >
          Tous TP
        </button>
        {byTp.map((tp) => (
          <button
            key={tp.code}
            type="button"
            onClick={() => updateFilters(filiere, codeTp === tp.code ? "" : tp.code)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition shadow-xs ${
              codeTp === tp.code
                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40"
                : "bg-card border border-border text-muted hover:text-foreground"
            }`}
          >
            {tp.code} ({tp.count})
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border glass-panel shadow-sm">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-secondary/60 text-xs font-bold uppercase tracking-wider text-muted border-b border-border">
            <tr>
              <th className="p-3.5 font-bold">Étudiant</th>
              <th className="p-3.5 font-bold">Matricule</th>
              <th className="p-3.5 font-bold">TP & Filière</th>
              <th className="p-3.5 font-bold">Quittance</th>
              <th className="p-3.5 font-bold">Montant</th>
              <th className="p-3.5 font-bold">Date</th>
              <th className="p-3.5 font-bold">Statut</th>
              <th className="p-3.5 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-10 text-center text-muted">
                  <RefreshCw className="mx-auto h-6 w-6 animate-spin text-primary" />
                  <p className="mt-2 text-xs font-medium">Chargement des registres...</p>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-10 text-center text-muted">
                  <Users className="mx-auto h-8 w-8 text-muted/60 mb-2" />
                  <p className="font-semibold text-foreground">Aucun étudiant ne correspond à ces critères.</p>
                  <p className="text-xs text-muted mt-1">Essayez de modifier vos filtres d'affichage.</p>
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.validation_id} className="bg-card/40 transition hover:bg-card-hover">
                  <td className="p-3.5">
                    <div className="font-bold text-foreground">
                      {r.prenom} {r.nom}
                    </div>
                    <div className="font-mono text-[11px] text-muted">{r.validation_id}</div>
                  </td>
                  <td className="p-3.5 font-mono text-xs font-semibold text-foreground">{r.matricule}</td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">{r.code_tp}</span>
                      <Badge variant="secondary" className="text-[10px] font-bold">
                        {r.filiere}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted truncate max-w-[200px] mt-0.5">{r.tp_title}</div>
                  </td>
                  <td className="p-3.5 font-mono text-xs text-muted">{r.numero_quittance}</td>
                  <td className="p-3.5 text-foreground font-bold">{formatAmount(r.montant)}</td>
                  <td className="p-3.5 text-xs text-muted">{formatDate(r.date_verification)}</td>
                  <td className="p-3.5">
                    <Badge variant="success" className="gap-1 font-bold">
                      <CheckCircle2 className="h-3 w-3" /> {r.statut}
                    </Badge>
                  </td>
                  <td className="p-3.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteStudent(r.validation_id, `${r.prenom} ${r.nom}`)}
                      className="h-8 w-8 p-0 text-muted hover:text-rose-600 hover:bg-rose-500/10"
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

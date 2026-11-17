import { useEffect, useState, useMemo } from "react";
import { adminFetch } from "@/lib/api";
import { getApiUrl } from "@/lib/config";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, Skeleton } from "@/components/ui/admin-ui";
import {
  Upload,
  UserCheck,
  FileSpreadsheet,
  Trash2,
  Filter,
  Search,
  CheckCircle2,
  RefreshCw,
  FileCheck2,
  Layers,
  ArrowRight,
} from "lucide-react";

type OfficialStudent = {
  matricule: string;
  nom: string;
  prenom: string;
  filiere: string;
  created_at?: string;
};

export default function OfficialStudentsPage() {
  const [rows, setRows] = useState<OfficialStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [filiere, setFiliere] = useState("");

  const API = getApiUrl();

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminFetch<OfficialStudent[]>("/api/admin/official-students");
      setRows(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filieres = useMemo(
    () => Array.from(new Set(rows.map((r) => r.filiere.toUpperCase()))).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    let list = rows;
    if (filiere) list = list.filter((r) => r.filiere.toUpperCase() === filiere.toUpperCase());
    if (q.trim()) {
      const term = q.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.matricule.toLowerCase().includes(term) ||
          r.nom.toLowerCase().includes(term) ||
          r.prenom.toLowerCase().includes(term) ||
          r.filiere.toLowerCase().includes(term)
      );
    }
    return list;
  }, [rows, filiere, q]);

  // Importation de la base officielle
  const handleImportRoster = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErr("");
    setMsg("");
    setImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", importMode);

      const token = await (await import("@/lib/api")).warmupAuth();
      if (!token) throw new Error("Session expirée");

      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non connecté");

      const res = await fetch(`${API}/api/admin/official-students/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Échec de l'importation");

      setMsg(json.message);
      await load();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Erreur lors de l'importation");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  // Réconciliation & Génération du PV Excel (Onglets par filière + colonnes TP)
  const handleReconcileExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErr("");
    setMsg("");
    setReconciling(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non connecté");

      const res = await fetch(`${API}/api/admin/reconcile-excel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Échec de la réconciliation");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PV-Presence-TP-Reconcilie-${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      setMsg("Le PV de présence réconcilié a été généré et téléchargé avec succès !");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Erreur lors de la génération du PV");
    } finally {
      setReconciling(false);
      e.target.value = "";
    }
  };

  const handleDeleteStudent = async (matricule: string) => {
    if (!confirm(`Retirer le matricule ${matricule} de la base officielle ?`)) return;
    try {
      await adminFetch(`/api/admin/official-students/${encodeURIComponent(matricule)}`, { method: "DELETE" });
      setRows((prev) => prev.filter((r) => r.matricule !== matricule));
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Erreur de suppression");
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Base Étudiants Officielle & PV TP"
        description="Gestion du registre officiel des étudiants autorisés et réconciliation des feuilles d'émargement"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* MODULE 1: Importation Base Officielle */}
        <Card className="glass-panel border-emerald-500/20 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Initialiser / Importer la Base Officielle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted leading-relaxed">
              Téléversez le fichier <strong>base_etudiants.xlsx</strong>. Les étudiants inscrits seront les seuls autorisés à vérifier leurs quittances.
            </p>

            {/* Choix du mode : Fusion vs Remplacement */}
            <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-3">
              <span className="text-xs font-bold text-muted">Mode d'importation :</span>
              <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === "merge"}
                  onChange={() => setImportMode("merge")}
                  className="accent-primary"
                />
                Fusionner / Mettre à jour (Option A)
              </label>
              <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-rose-600 dark:text-rose-400">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === "replace"}
                  onChange={() => setImportMode("replace")}
                  className="accent-rose-500"
                />
                Remplacer totalement (Option B)
              </label>
            </div>

            <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-500/40 bg-emerald-500/5 px-4 transition hover:bg-emerald-500/10">
              <Upload className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mb-1" />
              <span className="text-xs font-bold text-foreground">
                {importing ? "Importation en cours..." : "Téléverser base_etudiants.xlsx"}
              </span>
              <span className="text-[11px] text-muted">Format Excel (.xlsx) · Matricule | Nom | Prénom | Filière</span>
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls"
                disabled={importing}
                onChange={handleImportRoster}
              />
            </label>
          </CardContent>
        </Card>

        {/* MODULE 2: Réconciliation & Génération du PV Excel */}
        <Card className="glass-panel border-sky-500/20 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <FileCheck2 className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              Réconciliation & Génération des PV de TP
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted leading-relaxed">
              Téléversez n'importe quelle liste d'étudiants. Le système va générer un fichier Excel avec <strong>un onglet par filière</strong> et ajouter les colonnes <strong className="text-emerald-600 dark:text-emerald-400">VÉRIFIÉ</strong> / <strong className="text-rose-600 dark:text-rose-400">NON VÉRIFIÉ</strong> pour chaque TP.
            </p>

            <label className="flex h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-500/40 bg-sky-500/5 px-4 transition hover:bg-sky-500/10">
              <FileSpreadsheet className="h-8 w-8 text-sky-600 dark:text-sky-400 mb-1.5" />
              <span className="text-xs font-bold text-foreground">
                {reconciling ? "Génération du PV..." : "Importer la liste d'émargement (.xlsx)"}
              </span>
              <span className="mt-1 flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 font-semibold">
                <Layers className="h-3.5 w-3.5" /> Génère 1 onglet/filière + colonnes TP automatiques <ArrowRight className="h-3 w-3" />
              </span>
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls"
                disabled={reconciling}
                onChange={handleReconcileExcel}
              />
            </label>
          </CardContent>
        </Card>
      </div>

      {msg && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {msg}
        </div>
      )}

      {err && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-bold text-rose-600 dark:text-rose-400">
          {err}
        </div>
      )}

      {/* Barre de filtrage de la base officielle */}
      <div className="glass-panel rounded-2xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <Filter className="h-4 w-4" /> RECHERCHE BASE OFFICIELLE :
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted">Filière :</span>
            <select
              value={filiere}
              onChange={(e) => setFiliere(e.target.value)}
              className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground outline-none focus:border-emerald-500 shadow-xs"
            >
              <option value="">Toutes filières ({rows.length})</option>
              {filieres.map((f) => {
                const count = rows.filter((r) => r.filiere.toUpperCase() === f).length;
                return (
                  <option key={f} value={f}>
                    Filière {f} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {(filiere || q) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFiliere("");
                setQ("");
              }}
              className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400"
            >
              Réinitialiser
            </Button>
          )}

          <div className="relative ml-auto min-w-[240px] flex-1 sm:flex-initial">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              className="bg-card pl-9 shadow-xs"
              placeholder="Rechercher nom, matricule, filière..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Registre des étudiants inscrits */}
      <Card className="glass-panel border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base font-bold text-foreground">
            <span className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> Registre officiel ({filtered.length})
            </span>
            <Badge variant="secondary" className="font-mono text-xs font-bold">
              {filtered.length} inscrit(s)
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-secondary/60 text-xs font-bold uppercase tracking-wider text-muted border-b border-border">
                <tr>
                  <th className="p-3.5 font-bold">Matricule</th>
                  <th className="p-3.5 font-bold">Nom</th>
                  <th className="p-3.5 font-bold">Prénom(s)</th>
                  <th className="p-3.5 font-bold">Filière</th>
                  <th className="p-3.5 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-muted">
                      <RefreshCw className="mx-auto h-6 w-6 animate-spin text-primary" />
                      <p className="mt-2 text-xs font-medium">Chargement du registre officiel...</p>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-muted">
                      Aucun étudiant inscrit trouvé dans la base officielle.
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => (
                    <tr key={s.matricule} className="bg-card/40 transition hover:bg-card-hover">
                      <td className="p-3.5 font-mono text-xs font-bold text-primary">{s.matricule}</td>
                      <td className="p-3.5 font-bold text-foreground">{s.nom}</td>
                      <td className="p-3.5 text-foreground">{s.prenom}</td>
                      <td className="p-3.5">
                        <Badge variant="secondary" className="font-bold text-xs">
                          {s.filiere}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStudent(s.matricule)}
                          className="h-8 w-8 p-0 text-muted hover:text-rose-600 hover:bg-rose-500/10"
                          title="Supprimer de la base officielle"
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
        </CardContent>
      </Card>
    </div>
  );
}

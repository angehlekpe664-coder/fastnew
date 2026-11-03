import { useState, useEffect } from "react";
import { AlertTriangle, Pause, Play, Radio, RefreshCw, Search, Filter, Trash2, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/admin-ui";
import { formatDate } from "@/lib/utils";
import { useFailuresFeed, type LiveStatus } from "@/hooks/useFailuresFeed";
import { adminFetch } from "@/lib/api";

function LiveBadge({ status }: { status: LiveStatus }) {
  if (status === "loading") {
    return <Badge variant="secondary">Chargement…</Badge>;
  }
  if (status === "paused") {
    return (
      <Badge variant="secondary">
        <Pause className="h-3 w-3" /> Pause
      </Badge>
    );
  }
  if (status === "error") {
    return <Badge variant="danger">Hors ligne</Badge>;
  }
  if (status === "live") {
    return (
      <Badge variant="success" className="gap-1.5 font-bold">
        <span className="live-dot" /> En direct
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1.5">
      <Radio className="h-3 w-3 animate-pulse" /> Sync 6s
    </Badge>
  );
}

export default function FailuresPage() {
  const [q, setQ] = useState("");
  const [filiere, setFiliere] = useState("");
  const [codeTp, setCodeTp] = useState("");
  const [motifFilter, setMotifFilter] = useState("");
  const [live, setLive] = useState(true);
  const [filieres, setFilieres] = useState<string[]>([]);

  useEffect(() => {
    adminFetch<string[]>("/api/admin/filieres").then(setFilieres).catch(console.error);
  }, []);

  const effectiveQuery = [q, filiere ? `filiere=${filiere}` : "", codeTp ? `tp=${codeTp}` : "", motifFilter]
    .filter(Boolean)
    .join(" ");

  const { rows, totalToday, status, newIds, error, refresh } = useFailuresFeed(effectiveQuery, live);

  const handleDeleteFailure = async (id: string) => {
    if (!confirm("Voulez-vous supprimer ce rapport d'échec ?")) return;
    try {
      await adminFetch(`/api/admin/failures/${id}`, { method: "DELETE" });
      void refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Échec de la suppression");
    }
  };

  const getMotifBadge = (motif: string) => {
    const m = motif.toLowerCase();
    if (m.includes("falsification") || m.includes("altération") || m.includes("icuid")) {
      return (
        <Badge variant="danger" className="gap-1 font-bold border border-rose-500/30">
          <ShieldAlert className="h-3.5 w-3.5" /> FALSIFICATION DÉTECTÉE
        </Badge>
      );
    }
    if (m.includes("identité") || m.includes("nom") || m.includes("concordante")) {
      return (
        <Badge variant="warning" className="gap-1 font-bold border border-amber-500/30">
          IDENTITÉ NON MATCHÉE
        </Badge>
      );
    }
    if (m.includes("déjà") || m.includes("enregistrée")) {
      return (
        <Badge variant="secondary" className="gap-1 font-bold">
          QUITTANCE DÉJÀ UTILISÉE
        </Badge>
      );
    }
    return <Badge variant="danger" className="font-bold">REJETÉ</Badge>;
  };

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Vérifications échouées</h1>
          <p className="mt-1 text-sm text-muted font-medium">
            {rows.length} rejet(s) affiché(s) · <strong className="text-rose-600 dark:text-rose-400">{totalToday} aujourd&apos;hui</strong>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <LiveBadge status={status} />
          <Button variant="outline" size="sm" onClick={() => setLive((v) => !v)} className="h-9">
            {live ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {live ? "Pause" : "Reprendre"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={status === "loading"} className="h-9">
            <RefreshCw className={`h-4 w-4 ${status === "loading" ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Barre de tri & filtres avancés des échecs */}
      <div className="glass-panel rounded-2xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            <Filter className="h-4 w-4" /> TRIER / FILTRER :
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted">Filière :</span>
            <select
              value={filiere}
              onChange={(e) => setFiliere(e.target.value)}
              className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground outline-none focus:border-primary shadow-xs"
            >
              <option value="">Toutes filières</option>
              {filieres.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted">Motif :</span>
            <select
              value={motifFilter}
              onChange={(e) => setMotifFilter(e.target.value)}
              className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-foreground outline-none focus:border-primary shadow-xs"
            >
              <option value="">Tous motifs</option>
              <option value="falsification">Falsifications PDF</option>
              <option value="identité">Identité discordante</option>
              <option value="déjà">Quittances déjà utilisées</option>
              <option value="montant">Erreurs de montant</option>
            </select>
          </div>

          {(filiere || codeTp || motifFilter || q) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                setFiliere("");
                setCodeTp("");
                setMotifFilter("");
              }}
              className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400"
            >
              Effacer
            </Button>
          )}

          <div className="relative ml-auto min-w-[220px] flex-1 sm:flex-initial">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              className="bg-card pl-9 shadow-xs"
              placeholder="Nom, matricule, motif, TP…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      {status === "loading" && rows.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      )}

      {!rows.length && status !== "loading" && (
        <div className="glass-panel rounded-2xl p-10 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-10 w-10 text-muted/60" />
          <p className="mt-3 font-bold text-foreground text-base">Aucun rejet trouvé</p>
          <p className="mt-1 text-sm text-muted">
            {q || filiere || motifFilter
              ? "Aucun rejet ne correspond à ces critères."
              : "Les nouveaux rejets apparaîtront ici en temps réel."}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((r) => (
          <article
            key={r.id}
            className={`glass-panel rounded-2xl p-4 transition-all duration-200 hover:border-rose-500/40 shadow-xs ${
              newIds.has(r.id) ? "failure-new border-rose-500/50" : ""
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-foreground text-base">
                    {r.prenom} {r.nom}
                  </span>
                  <span className="font-mono text-xs font-semibold text-muted bg-secondary px-2 py-0.5 rounded-md">
                    {r.matricule || "—"}
                  </span>
                  {newIds.has(r.id) && (
                    <Badge variant="danger" className="text-[10px] uppercase tracking-wide font-bold">
                      Nouveau
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-rose-600 dark:text-rose-400">
                  {r.motif}
                </p>
                <p className="mt-1.5 text-xs font-medium text-muted">
                  Filière <strong>{r.filiere}</strong> · TP <strong className="font-mono">{r.code_tp || "—"}</strong> · {formatDate(r.created_at)}
                </p>
              </div>

              <div className="flex items-center gap-2.5 self-start shrink-0">
                {getMotifBadge(r.motif)}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteFailure(r.id)}
                  className="h-8 w-8 p-0 text-muted hover:text-rose-600 hover:bg-rose-500/10"
                  title="Supprimer ce rejet"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

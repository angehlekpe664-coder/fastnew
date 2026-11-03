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
      <Badge variant="success" className="gap-1.5">
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

  // Utiliser search query enrichi
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
        <Badge variant="danger" className="gap-1">
          <ShieldAlert className="h-3 w-3" /> FALSIFICATION DÉTECTÉE
        </Badge>
      );
    }
    if (m.includes("identité") || m.includes("nom") || m.includes("concordante")) {
      return <Badge variant="warning">IDENTITÉ NON MATCHÉE</Badge>;
    }
    if (m.includes("déjà") || m.includes("enregistrée")) {
      return <Badge variant="secondary">QUITTANCE DÉJÀ UTILISÉE</Badge>;
    }
    return <Badge variant="danger">REJETÉ</Badge>;
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Vérifications échouées</h1>
          <p className="mt-1 text-sm text-muted">
            {rows.length} rejet(s) affiché(s) · {totalToday} aujourd&apos;hui
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <LiveBadge status={status} />
          <Button variant="outline" size="sm" onClick={() => setLive((v) => !v)}>
            {live ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {live ? "Pause" : "Reprendre"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={status === "loading"}>
            <RefreshCw className={`h-4 w-4 ${status === "loading" ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Barre de tri & filtres avancés des échecs */}
      <div className="mb-5 glass-panel rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
            <Filter className="h-4 w-4 text-primary" /> Trier / Filtrer :
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Filière :</span>
            <select
              value={filiere}
              onChange={(e) => setFiliere(e.target.value)}
              className="h-9 rounded-xl border border-border bg-secondary px-3 text-xs font-medium text-foreground outline-none focus:border-primary"
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
            <span className="text-xs text-muted">Motif :</span>
            <select
              value={motifFilter}
              onChange={(e) => setMotifFilter(e.target.value)}
              className="h-9 rounded-xl border border-border bg-secondary px-3 text-xs font-medium text-foreground outline-none focus:border-primary"
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
              className="text-xs text-muted hover:text-foreground"
            >
              Effacer
            </Button>
          )}

          <div className="relative ml-auto min-w-[220px] flex-1 sm:flex-initial">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              className="bg-secondary pl-9"
              placeholder="Nom, matricule, motif, TP…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {status === "loading" && rows.length === 0 && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      )}

      {!rows.length && status !== "loading" && (
        <div className="glass-panel rounded-2xl p-10 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-muted" />
          <p className="mt-3 font-medium">Aucun rejet trouvé</p>
          <p className="mt-1 text-sm text-muted">
            {q || filiere || motifFilter
              ? "Aucun rejet ne correspond à ces critères."
              : "Les nouveaux rejets apparaîtront ici en temps réel."}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {rows.map((r) => (
          <article
            key={r.id}
            className={`glass-panel rounded-xl p-4 transition hover:border-danger/25 ${
              newIds.has(r.id) ? "failure-new border-danger/40" : ""
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {r.prenom} {r.nom}
                  </span>
                  <span className="font-mono text-xs text-muted">{r.matricule || "—"}</span>
                  {newIds.has(r.id) && (
                    <Badge variant="danger" className="text-[10px] uppercase tracking-wide">
                      Nouveau
                    </Badge>
                  )}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-danger/90 font-medium">{r.motif}</p>
                <p className="mt-1 text-xs text-muted">
                  Filière {r.filiere} · TP {r.code_tp || "—"} · {formatDate(r.created_at)}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start shrink-0">
                {getMotifBadge(r.motif)}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteFailure(r.id)}
                  className="h-8 w-8 p-0 text-muted hover:text-danger"
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

import { useState } from "react";
import { AlertTriangle, Pause, Play, Radio, RefreshCw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/admin-ui";
import { formatDate } from "@/lib/utils";
import { useFailuresFeed, type LiveStatus } from "@/hooks/useFailuresFeed";

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
  const [live, setLive] = useState(true);
  const { rows, totalToday, status, newIds, error, refresh } = useFailuresFeed(q, live);

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

      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          className="bg-secondary pl-9"
          placeholder="Nom, matricule, motif, TP…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
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
          <p className="mt-3 font-medium">Aucun rejet pour le moment</p>
          <p className="mt-1 text-sm text-muted">
            {q ? "Aucun résultat pour cette recherche." : "Les nouveaux rejets apparaîtront ici en temps réel."}
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
                <p className="mt-1.5 text-sm leading-relaxed text-danger/90">{r.motif}</p>
                <p className="mt-1 text-xs text-muted">
                  {r.filiere} · {r.code_tp || "—"} · {formatDate(r.created_at)}
                </p>
              </div>
              <Badge variant="danger" className="self-start shrink-0">
                REJETÉ
              </Badge>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

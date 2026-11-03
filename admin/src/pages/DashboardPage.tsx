import { useEffect, useState, type ElementType } from "react";
import { adminFetch, downloadExport } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Skeleton } from "@/components/ui/admin-ui";
import {
  CheckCircle2,
  XCircle,
  Users,
  Download,
  BookOpen,
  PieChart,
  FileSpreadsheet,
  FileText,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";

type Stats = {
  validated: number;
  failed: number;
  total: number;
  validationRate: number;
  byFiliere: { filiere: string; count: number }[];
  byTp: { code: string; title: string; count: number }[];
  failureMotifs?: { motif: string; count: number }[];
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    adminFetch<Stats>("/api/admin/stats").then(setStats).catch(console.error);
  }, []);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Tableau de bord"
        description="Aperçu analytique des vérifications de quittances par TP et filière"
      />

      {/* Cartes KPI colorées et douces */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={CheckCircle2}
          label="Quittances Validées"
          value={stats?.validated ?? "—"}
          subtext="Conformes & certifiées"
          bgIcon="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          borderColor="hover:border-emerald-500/30"
          link="/students"
          loading={!stats}
        />
        <KpiCard
          icon={XCircle}
          label="Échecs / Rejets"
          value={stats?.failed ?? "—"}
          subtext="Tentatives rejetées"
          bgIcon="bg-rose-500/10 text-rose-600 dark:text-rose-400"
          borderColor="hover:border-rose-500/30"
          link="/failures"
          loading={!stats}
        />
        <KpiCard
          icon={Users}
          label="Total Traité"
          value={stats?.total ?? "—"}
          subtext="Demandes analysées"
          bgIcon="bg-sky-500/10 text-sky-600 dark:text-sky-400"
          borderColor="hover:border-sky-500/30"
          loading={!stats}
        />
        <KpiCard
          icon={TrendingUp}
          label="Taux de Conformation"
          value={stats ? `${stats.validationRate}%` : "—"}
          subtext="Taux de réussite global"
          bgIcon="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          borderColor="hover:border-amber-500/30"
          progress={stats?.validationRate}
          loading={!stats}
        />
      </div>

      {/* Graphique / Répartition par TP et par Filière */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Par Code TP */}
        <Card className="glass-panel border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base font-bold text-foreground">
              <span className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Vérifications par TP
              </span>
              <Badge variant="secondary" className="font-mono text-xs">
                {stats?.byTp.length ?? 0} TP actif(s)
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!stats && [1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}
            {stats && stats.byTp.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">Aucune quittance validée pour l'instant.</p>
            )}
            {stats?.byTp.map((tp) => {
              const pct = stats.validated > 0 ? Math.round((tp.count / stats.validated) * 100) : 0;
              return (
                <Link
                  key={tp.code}
                  to={`/students?codeTp=${encodeURIComponent(tp.code)}`}
                  className="group block rounded-2xl border border-border bg-card/60 p-3.5 transition hover:border-emerald-500/40 hover:bg-card-hover"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {tp.code}
                        </span>
                        <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100 text-muted" />
                      </div>
                      <div className="truncate text-xs text-muted">{tp.title}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold text-foreground">{tp.count}</span>
                      <span className="ml-1 text-xs text-muted">({pct}%)</span>
                    </div>
                  </div>
                  {/* Barre de progression douce */}
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* Par Filière */}
        <Card className="glass-panel border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base font-bold text-foreground">
              <span className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                Répartition par Filière
              </span>
              <Badge variant="secondary" className="text-xs">
                {stats?.byFiliere.length ?? 0} filière(s)
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!stats && [1, 2].map((i) => <Skeleton key={i} className="h-12" />)}
            {stats && stats.byFiliere.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">Aucune donnée par filière.</p>
            )}
            {stats?.byFiliere.map((f, idx) => {
              const pct = stats.validated > 0 ? Math.round((f.count / stats.validated) * 100) : 0;
              const colors = [
                { bg: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
                { bg: "bg-sky-500", text: "text-sky-600 dark:text-sky-400" },
                { bg: "bg-purple-500", text: "text-purple-600 dark:text-purple-400" },
                { bg: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
              ];
              const c = colors[idx % colors.length];

              return (
                <Link
                  key={f.filiere}
                  to={`/students?filiere=${encodeURIComponent(f.filiere)}`}
                  className="group block rounded-2xl border border-border bg-card/60 p-3.5 transition hover:border-sky-500/40 hover:bg-card-hover"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Filière {f.filiere}</span>
                    <span className={`font-bold ${c.text}`}>
                      {f.count} validé(s) <span className="text-xs font-normal text-muted">({pct}%)</span>
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full ${c.bg} transition-all duration-500`}
                      style={{ width: `${Math.max(pct, 5)}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Motif des rejets / Échecs */}
      {stats && stats.failureMotifs && stats.failureMotifs.length > 0 && (
        <Card className="glass-panel border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              Analyse des motifs de rejets
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.failureMotifs.map((item) => (
              <div
                key={item.motif}
                className="flex items-center justify-between rounded-2xl border border-rose-500/20 bg-rose-50/50 p-3.5 dark:bg-rose-950/20"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-foreground">{item.motif}</p>
                  <p className="text-[11px] text-muted">Incohérence ou non-conformité</p>
                </div>
                <Badge variant="danger" className="shrink-0 font-mono font-bold">
                  {item.count}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions d'Exportation Rapide */}
      <Card className="glass-panel border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-foreground">Exportation des registres de validation</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => downloadExport("xlsx")}
            className="h-11 border-emerald-500/30 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel (XLSX)
          </Button>
          <Button
            variant="outline"
            onClick={() => downloadExport("csv")}
            className="h-11 border-sky-500/30 bg-sky-50/50 text-sky-700 hover:bg-sky-100 hover:text-sky-800 dark:bg-sky-950/30 dark:text-sky-300 dark:hover:bg-sky-900/50"
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => downloadExport("pdf")}
            className="h-11 border-purple-500/30 bg-purple-50/50 text-purple-700 hover:bg-purple-100 hover:text-purple-800 dark:bg-purple-950/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
          >
            <FileText className="mr-2 h-4 w-4" /> Export Texte / PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  subtext,
  bgIcon,
  borderColor,
  link,
  progress,
  loading,
}: {
  icon: ElementType;
  label: string;
  value: string | number;
  subtext: string;
  bgIcon: string;
  borderColor: string;
  link?: string;
  progress?: number;
  loading?: boolean;
}) {
  if (loading) return <Skeleton className="h-28" />;

  const content = (
    <Card className={`glass-panel border-border transition-all duration-200 ${borderColor} hover:shadow-md`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted">{label}</p>
            <h3 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{value}</h3>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${bgIcon}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        {progress !== undefined && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-amber-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        )}
        <p className="mt-2 text-[11px] text-muted">{subtext}</p>
      </CardContent>
    </Card>
  );

  if (link) return <Link to={link}>{content}</Link>;
  return content;
}

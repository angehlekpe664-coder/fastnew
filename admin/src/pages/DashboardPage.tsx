import { useEffect, useState, type ElementType } from "react";
import { adminFetch, downloadExport } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader, Skeleton } from "@/components/ui/admin-ui";
import { CheckCircle2, XCircle, Users, Download, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

type Stats = {
  validated: number;
  failed: number;
  total: number;
  validationRate: number;
  byFiliere: { filiere: string; count: number }[];
  byTp: { code: string; title: string; count: number }[];
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    adminFetch<Stats>("/api/admin/stats").then(setStats).catch(console.error);
  }, []);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Tableau de bord" description="Vue d'ensemble des vérifications par TP" />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat icon={CheckCircle2} label="Validés" value={stats?.validated ?? "—"} color="text-success" loading={!stats} />
        <Stat icon={XCircle} label="Échecs" value={stats?.failed ?? "—"} color="text-danger" loading={!stats} />
        <Stat icon={Users} label="Total" value={stats?.total ?? "—"} color="text-accent" loading={!stats} />
        <Stat icon={CheckCircle2} label="Taux OK" value={stats ? `${stats.validationRate}%` : "—"} color="text-primary" loading={!stats} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <BookOpen className="h-5 w-5 text-primary" /> Par code TP
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!stats && [1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}
            {stats && stats.byTp.length === 0 && (
              <p className="text-sm text-muted">Aucune quittance validée pour l'instant.</p>
            )}
            {stats?.byTp.map((tp) => (
              <Link
                key={tp.code}
                to={`/students?codeTp=${encodeURIComponent(tp.code)}`}
                className="flex items-center justify-between rounded-xl border border-border bg-secondary/50 px-4 py-3 transition hover:border-primary/30 hover:bg-card-hover"
              >
                <div>
                  <div className="font-mono font-bold text-accent">{tp.code}</div>
                  <div className="text-xs text-muted">{tp.title}</div>
                </div>
                <span className="text-lg font-bold text-foreground">{tp.count}</span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="text-foreground">Par filière</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!stats && [1, 2].map((i) => <Skeleton key={i} className="h-10" />)}
            {stats?.byFiliere.map((f) => (
              <div key={f.filiere} className="flex justify-between rounded-xl bg-secondary/50 px-4 py-2.5">
                <span className="text-foreground">{f.filiere}</span>
                <span className="font-bold text-primary">{f.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel mt-6">
        <CardHeader>
          <CardTitle className="text-foreground">Exports</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => downloadExport("csv")}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" onClick={() => downloadExport("xlsx")}>
            <Download className="h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" onClick={() => downloadExport("pdf")}>
            <Download className="h-4 w-4" /> PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  color,
  loading,
}: {
  icon: ElementType;
  label: string;
  value: string | number;
  color: string;
  loading?: boolean;
}) {
  if (loading) return <Skeleton className="h-24" />;
  return (
    <Card className="glass-panel">
      <CardContent className="flex items-center gap-3 p-5">
        <Icon className={`h-8 w-8 ${color}`} />
        <div>
          <div className="text-2xl font-bold text-foreground">{value}</div>
          <div className="text-xs text-muted">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

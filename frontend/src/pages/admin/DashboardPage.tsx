import { useEffect, useState, type ElementType } from "react";
import { useNavigate } from "react-router-dom";
import { Users, XCircle, CheckCircle2, Download } from "lucide-react";
import { AdminLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/api";

type Stats = {
  validated: number;
  failed: number;
  total: number;
  validationRate: number;
  byFiliere: Array<{ filiere: string; count: number }>;
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    adminFetch<Stats>("/api/admin/stats")
      .then(setStats)
      .catch(() => {
        localStorage.removeItem("admin_token");
        navigate("/admin/login");
      });
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("admin_token");
    navigate("/admin/login");
  };

  const exportFile = async (format: "csv" | "xlsx" | "pdf") => {
    const token = localStorage.getItem("admin_token");
    const res = await fetch(`/api/admin/export/${format}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `etudiants-valides.${format === "xlsx" ? "xlsx" : format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout onLogout={logout}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-muted">Vue d'ensemble des vérifications</p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard icon={CheckCircle2} label="Validés" value={stats?.validated ?? "—"} color="text-success" />
        <StatCard icon={XCircle} label="Échecs" value={stats?.failed ?? "—"} color="text-danger" />
        <StatCard icon={Users} label="Total vérifications" value={stats?.total ?? "—"} color="text-primary" />
        <StatCard icon={CheckCircle2} label="Taux validation" value={stats ? `${stats.validationRate}%` : "—"} color="text-primary" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Répartition par filière</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(stats?.byFiliere ?? []).map((f) => (
              <div key={f.filiere} className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-2">
                <span className="font-medium">{f.filiere}</span>
                <span className="text-primary font-bold">{f.count}</span>
              </div>
            ))}
            {!stats?.byFiliere?.length && <p className="text-sm text-muted">Aucune donnée pour le moment.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Exports</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => exportFile("csv")}><Download className="h-4 w-4" /> CSV</Button>
            <Button variant="outline" onClick={() => exportFile("xlsx")}><Download className="h-4 w-4" /> Excel</Button>
            <Button variant="outline" onClick={() => exportFile("pdf")}><Download className="h-4 w-4" /> PDF</Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: ElementType; label: string; value: string | number; color: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`rounded-xl bg-secondary p-3 ${color}`}><Icon className="h-5 w-5" /></div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm text-muted">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

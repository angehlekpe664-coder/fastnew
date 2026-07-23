import { useState } from "react";
import { PublicLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { lookupValidation } from "@/lib/api";
import { formatAmount, formatDate } from "@/lib/utils";
import { Search, CheckCircle2 } from "lucide-react";

export default function StatusPage() {
  const [id, setId] = useState("");
  const [data, setData] = useState<Record<string, string | number> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setData(null);
    try {
      setData(await lookupValidation(id.trim()));
    } catch {
      setError("Aucune validation trouvée pour cet identifiant.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-md px-4 py-10 animate-fade-in">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" /> Consulter un statut
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={search} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Identifiant de validation</Label>
                <Input placeholder="UV-XXXX..." value={id} onChange={(e) => setId(e.target.value)} className="font-mono" />
              </div>
              <Button className="w-full" disabled={loading || !id.trim()}>
                {loading ? "Recherche..." : "Vérifier le statut"}
              </Button>
            </form>
            {error && <p className="text-sm text-danger">{error}</p>}
            {data && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                <div className="mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <Badge variant="success">{String(data.statut)}</Badge>
                </div>
                <p className="font-semibold">{data.prenom as string} {data.nom as string}</p>
                <p className="text-sm text-muted">{data.matricule as string} · {data.filiere as string}</p>
                <p className="mt-2 text-sm">{data.code_tp as string} — {data.tp_title as string}</p>
                <p className="text-sm font-medium text-primary">{formatAmount(data.montant as number)}</p>
                <p className="mt-1 text-xs text-muted">Vérifié le {formatDate(data.date_verification as string)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}

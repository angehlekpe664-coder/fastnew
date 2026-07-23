import { useState } from "react";
import { PublicLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
      <div className="mx-auto max-w-md animate-fade-in px-4 py-6 sm:py-10">
        <Card className="shadow-sm">
          <CardContent className="space-y-4 p-4 pt-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 shrink-0 text-primary" />
              <h1 className="text-lg font-bold">Consulter un statut</h1>
            </div>
            <p className="text-sm text-muted">Entrez l&apos;identifiant reçu après vérification (ex. UV-…).</p>

            <form onSubmit={search} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Identifiant de validation</Label>
                <Input
                  placeholder="UV-XXXX..."
                  value={id}
                  onChange={(e) => setId(e.target.value.toUpperCase())}
                  className="font-mono"
                  autoComplete="off"
                  enterKeyHint="search"
                />
              </div>
              <Button className="w-full" disabled={loading || !id.trim()}>
                {loading ? "Recherche..." : "Vérifier le statut"}
              </Button>
            </form>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger dark:bg-red-950/30">{error}</p>}

            {data && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                <div className="mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                  <Badge variant="success">{String(data.statut)}</Badge>
                </div>
                <p className="font-semibold">
                  {data.prenom as string} {data.nom as string}
                </p>
                <p className="text-sm text-muted">
                  {data.matricule as string} · {data.filiere as string}
                </p>
                <p className="mt-2 break-words text-sm">
                  {data.code_tp as string} — {data.tp_title as string}
                </p>
                <p className="text-base font-medium text-primary">{formatAmount(data.montant as number)}</p>
                <p className="mt-1 text-xs text-muted">Vérifié le {formatDate(data.date_verification as string)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}

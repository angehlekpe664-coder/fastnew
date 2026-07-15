import { Link, useLocation, Navigate } from "react-router-dom";
import { CheckCircle2, XCircle, Copy, Home } from "lucide-react";
import { PublicLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatAmount, formatDate } from "@/lib/utils";
import type { VerifyFailure, VerifySuccess } from "@/lib/api";

export default function ResultPage() {
  const location = useLocation();
  const result = location.state?.result as VerifySuccess | VerifyFailure | undefined;

  if (!result) return <Navigate to="/verifier" replace />;

  const copyId = (id: string) => navigator.clipboard.writeText(id);

  if (!result.success) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-2xl px-4 py-12 animate-fade-in">
          <Card className="border-red-200">
            <CardHeader className="text-center">
              <XCircle className="mx-auto h-16 w-16 text-danger" />
              <CardTitle className="text-danger">Quittance invalide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <p className="text-muted">{result.motif}</p>
              <p className="text-sm text-muted">Aucun enregistrement n'a été effectué.</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link to="/verifier"><Button>Réessayer</Button></Link>
                <Link to="/"><Button variant="outline"><Home className="h-4 w-4" /> Accueil</Button></Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-2xl px-4 py-12 animate-fade-in">
        <Card className="border-emerald-200">
          <CardHeader className="text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
            <CardTitle className="text-success">Paiement vérifié avec succès</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-2xl bg-secondary p-5 text-center">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">Identifiant de validation</div>
              <div className="mt-2 flex items-center justify-center gap-2 text-2xl font-bold text-primary">
                {result.validationId}
                <Button variant="ghost" size="sm" onClick={() => copyId(result.validationId)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid gap-3 text-sm">
              <Row label="Étudiant" value={`${result.student.prenom} ${result.student.nom}`} />
              <Row label="Filière / Niveau" value={`${result.student.filiere} — Niveau ${result.student.niveau}`} />
              <Row label="N° Quittance" value={result.student.numeroQuittance} />
              <Row label="Montant" value={formatAmount(result.student.montant)} />
              <Row label="Date vérification" value={formatDate(result.student.dateVerification)} />
              <div><Badge variant="success">VALIDÉ</Badge></div>
            </div>

            <p className="text-center text-sm text-muted">
              Conservez cet identifiant. Il atteste que votre quittance a été vérifiée et enregistrée.
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/"><Button variant="outline"><Home className="h-4 w-4" /> Accueil</Button></Link>
              <Link to="/verifier"><Button>Nouvelle vérification</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

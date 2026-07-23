import { Link, useLocation, Navigate } from "react-router-dom";
import { CheckCircle2, XCircle, Copy, Home, Printer } from "lucide-react";
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

  if (!result.success) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-md px-4 py-12 animate-fade-in text-center">
          <Card className="border-red-200">
            <CardContent className="space-y-4 p-8">
              <XCircle className="mx-auto h-14 w-14 text-danger" />
              <h1 className="text-xl font-bold text-danger">Quittance invalide</h1>
              <p className="text-muted">{result.motif}</p>
              <div className="flex justify-center gap-2 pt-2">
                <Link to="/verifier"><Button>Réessayer</Button></Link>
                <Link to="/"><Button variant="outline"><Home className="h-4 w-4" /></Button></Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  const a = result.attestation;

  return (
    <PublicLayout>
      <div className="mx-auto max-w-md px-4 py-10 animate-fade-in">
        <Card className="overflow-hidden border-emerald-200">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-8 text-center text-white">
            <CheckCircle2 className="mx-auto h-12 w-12" />
            <h1 className="mt-3 text-xl font-bold">Paiement vérifié</h1>
            <p className="text-sm text-emerald-100">Votre quittance est conforme</p>
          </div>
          <CardContent className="space-y-4 p-6">
            <div className="rounded-xl bg-secondary p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Identifiant de validation</p>
              <div className="mt-1 flex items-center justify-center gap-2">
                <span className="font-mono text-xl font-bold text-primary">{result.validationId}</span>
                <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(result.validationId)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <Row label="Étudiant" value={`${a.prenom} ${a.nom}`} />
              <Row label="Matricule" value={a.matricule} />
              <Row label="Filière" value={a.filiere} />
              <Row label="TP" value={`${a.codeTp} — ${a.tpTitle}`} />
              {a.numeroQuittance && <Row label="Quittance" value={a.numeroQuittance} />}
              <Row label="Montant" value={formatAmount(a.montant)} />
              {a.dateVerification && <Row label="Vérifié le" value={formatDate(a.dateVerification)} />}
              <Badge variant="success">VALIDÉ</Badge>
            </div>

            <p className="text-center text-xs text-muted">
              Présentez cet identifiant au contrôleur de TP. Aucun compte requis.
            </p>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Imprimer
              </Button>
              <Link to="/" className="flex-1"><Button variant="outline" className="w-full"><Home className="h-4 w-4" /> Accueil</Button></Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border py-2">
      <span className="text-muted">{label}</span>
      <span className="max-w-[60%] text-right font-medium">{value}</span>
    </div>
  );
}

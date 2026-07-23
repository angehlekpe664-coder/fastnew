import { Link, useLocation, Navigate } from "react-router-dom";
import { CheckCircle2, XCircle, Copy, Home, Printer } from "lucide-react";
import { PublicLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
        <div className="mx-auto max-w-md animate-fade-in px-4 py-8 text-center sm:py-12">
          <Card className="border-red-200">
            <CardContent className="space-y-4 p-6 sm:p-8">
              <XCircle className="mx-auto h-14 w-14 text-danger" />
              <h1 className="text-xl font-bold text-danger">Quittance invalide</h1>
              <p className="text-sm leading-relaxed text-muted sm:text-base">{result.motif}</p>
              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
                <Link to="/verifier" className="flex-1 sm:flex-none">
                  <Button className="w-full">Réessayer</Button>
                </Link>
                <Link to="/" className="flex-1 sm:flex-none">
                  <Button variant="outline" className="w-full">
                    <Home className="h-4 w-4" /> Accueil
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  const a = result.attestation;

  const copyId = () => {
    void navigator.clipboard.writeText(result.validationId);
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-md animate-fade-in px-4 py-6 pb-8 sm:py-10">
        <Card className="overflow-hidden border-emerald-200 shadow-sm">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-7 text-center text-white sm:px-6 sm:py-8">
            <CheckCircle2 className="mx-auto h-12 w-12" />
            <h1 className="mt-3 text-xl font-bold">Paiement vérifié</h1>
            <p className="text-sm text-emerald-100">Votre quittance est conforme</p>
          </div>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="rounded-xl bg-secondary p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Identifiant de validation</p>
              <div className="mt-2 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                <span className="break-all font-mono text-lg font-bold text-primary sm:text-xl">{result.validationId}</span>
                <Button variant="outline" size="sm" className="shrink-0" onClick={copyId}>
                  <Copy className="h-4 w-4" /> Copier
                </Button>
              </div>
            </div>

            <div className="space-y-0 text-sm">
              <Row label="Étudiant" value={`${a.prenom} ${a.nom}`} />
              <Row label="Matricule" value={a.matricule} />
              <Row label="Filière" value={a.filiere} />
              <Row label="TP" value={`${a.codeTp} — ${a.tpTitle}`} />
              {a.numeroQuittance && <Row label="Quittance" value={a.numeroQuittance} />}
              <Row label="Montant" value={formatAmount(a.montant)} />
              {a.dateVerification && <Row label="Vérifié le" value={formatDate(a.dateVerification)} />}
              <div className="pt-3">
                <Badge variant="success">VALIDÉ</Badge>
              </div>
            </div>

            <p className="text-center text-xs leading-relaxed text-muted">
              Présentez cet identifiant au contrôleur de TP. Aucun compte requis.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="flex-1" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Imprimer
              </Button>
              <Link to="/" className="flex-1">
                <Button variant="outline" className="w-full">
                  <Home className="h-4 w-4" /> Accueil
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-xs font-medium uppercase tracking-wide text-muted sm:text-sm sm:normal-case sm:tracking-normal">{label}</span>
      <span className="break-words font-medium sm:max-w-[58%] sm:text-right">{value}</span>
    </div>
  );
}

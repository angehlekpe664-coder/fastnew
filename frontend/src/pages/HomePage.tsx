import { Link } from "react-router-dom";
import { ArrowRight, Shield, FileSearch, BadgeCheck, Landmark } from "lucide-react";
import { PublicLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <PublicLayout>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="relative mx-auto max-w-5xl px-4 py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
              <Landmark className="h-3.5 w-3.5" /> Trésor Public → Vérification UAC
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Validez votre quittance TP en 2 minutes
            </h1>
            <p className="mt-4 text-lg text-muted">
              Vous avez déjà payé sur le portail du Trésor ? Importez votre quittance ici.
              <strong className="text-foreground"> Aucun compte. Aucun paiement.</strong>
            </p>
            <Link to="/verifier" className="mt-8 inline-block">
              <Button size="lg" className="h-13 px-8 text-base shadow-lg shadow-primary/20">
                Vérifier ma quittance <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>

          <div className="mt-16 grid gap-4 md:grid-cols-3">
            {[
              { icon: Shield, title: "5 infos seulement", desc: "Nom, prénom, matricule, filière, code TP + votre quittance." },
              { icon: FileSearch, title: "Contrôles Trésor", desc: "Nom, code TP, année, montant et QR officiel — sans IA." },
              { icon: BadgeCheck, title: "Attestation instantanée", desc: "Recevez un identifiant unique à présenter au contrôleur." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

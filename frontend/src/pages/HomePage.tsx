import { Link } from "react-router-dom";
import { ArrowRight, Shield, FileSearch, BadgeCheck, Landmark } from "lucide-react";
import { PublicLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <PublicLayout>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-[11px] font-semibold text-primary sm:px-4 sm:text-xs">
              <Landmark className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Trésor Public → Vérification UAC</span>
            </div>
            <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
              Validez votre quittance TP en 2 minutes
            </h1>
            <p className="mt-3 text-base leading-relaxed text-muted sm:mt-4 sm:text-lg">
              Vous avez déjà payé sur le portail du Trésor ? Importez votre quittance ici.
              <strong className="text-foreground"> Aucun compte. Aucun paiement.</strong>
            </p>
            <Link to="/verifier" className="mt-6 block sm:mt-8 sm:inline-block">
              <Button size="lg" className="h-13 w-full px-6 text-base shadow-lg shadow-primary/20 sm:w-auto sm:px-8">
                Vérifier ma quittance <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>

          <div className="mt-10 grid gap-3 sm:mt-16 sm:gap-4 md:grid-cols-3">
            {[
              { icon: Shield, title: "5 infos seulement", desc: "Nom, prénom, matricule, filière, code TP + votre quittance." },
              { icon: FileSearch, title: "Contrôles Trésor", desc: "Nom, code TP, année, montant et QR officiel — sans IA." },
              { icon: BadgeCheck, title: "Attestation instantanée", desc: "Recevez un identifiant unique à présenter au contrôleur." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-border bg-card p-5 text-left shadow-sm sm:p-6 sm:text-center">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary sm:mx-auto">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

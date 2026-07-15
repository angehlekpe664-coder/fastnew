import { Link } from "react-router-dom";
import { ArrowRight, FileCheck, Shield, ScanLine, BadgeCheck } from "lucide-react";
import { PublicLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const steps = [
  { icon: FileCheck, title: "Remplissez le formulaire", desc: "Nom, filière, niveau et votre quittance PDF ou image." },
  { icon: ScanLine, title: "Analyse automatique", desc: "OCR, QR Code, montant, nom et règles configurables par l'administration." },
  { icon: BadgeCheck, title: "Recevez votre identifiant", desc: "Aucun compte requis. Un numéro de validation unique vous est délivré." },
];

export default function HomePage() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-6xl px-4 py-16 animate-fade-in">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="space-y-6 text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary">
              <Shield className="h-4 w-4" /> Service officiel de vérification
            </div>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              Vérifiez votre quittance de paiement TP
            </h1>
            <p className="text-lg text-muted">
              Les paiements se font sur le portail du Trésor Public. Cette plateforme vérifie
              uniquement l'authenticité de votre quittance et enregistre automatiquement votre validation.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/verifier">
                <Button size="lg">
                  Vérifier ma quittance <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted">Aucune création de compte étudiant requise.</p>
          </div>

          <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary to-[#003d99] text-white">
            <CardHeader>
              <CardTitle className="text-white">Comment ça marche ?</CardTitle>
              <CardDescription className="text-white/80">
                Processus simple en 3 étapes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {steps.map((s, i) => (
                <div key={s.title} className="flex gap-3 rounded-xl bg-white/10 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{i + 1}. {s.title}</div>
                    <div className="text-sm text-white/80">{s.desc}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </PublicLayout>
  );
}

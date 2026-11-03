import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/admin-ui";
import { Save, ShieldCheck, Sliders, CheckCircle2 } from "lucide-react";

type Rules = {
  expectedAmount: number;
  academicYear: string;
  paymentTitle: string;
  allowedDateFrom: string | null;
  allowedDateTo: string | null;
  treasuryDomain: string;
  requireQrCode: boolean;
  requireOfficialLogo: boolean;
  requireTpCodeMatch: boolean;
  requireYearMatch: boolean;
  requireAmountConsistency: boolean;
  requireNoModificationSoftware?: boolean;
  requirePkiCheck?: boolean;
  requireVectorStructure?: boolean;
};

export default function SettingsPage() {
  const [rules, setRules] = useState<Rules | null>(null);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminFetch<Rules>("/api/admin/settings").then(setRules).catch(console.error);
  }, []);

  const save = async () => {
    if (!rules) return;
    setSaving(true);
    await adminFetch("/api/admin/settings", { method: "PUT", body: JSON.stringify(rules) });
    setMsg("Paramètres enregistrés avec succès.");
    setSaving(false);
  };

  if (!rules) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const u = (k: keyof Rules, v: string | number | boolean | null) => setRules({ ...rules, [k]: v });

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title="Paramètres de validation"
        description="Configuration du pipeline de sécurité et des contrôles automatiques"
      />

      <Card className="glass-panel max-w-2xl border-purple-500/20 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <Sliders className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Paramètres généraux
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Année académique">
            <Input className="bg-card font-semibold" value={rules.academicYear} onChange={(e) => u("academicYear", e.target.value)} />
          </Field>
          <Field label="Montant par défaut (FCFA)">
            <Input className="bg-card font-bold" type="number" value={rules.expectedAmount} onChange={(e) => u("expectedAmount", +e.target.value)} />
          </Field>
          <Field label="Intitulé du paiement">
            <Input className="bg-card font-medium" value={rules.paymentTitle} onChange={(e) => u("paymentTitle", e.target.value)} />
          </Field>
          <Field label="Domaine QR Trésor autorisé">
            <Input className="bg-card font-mono text-xs" value={rules.treasuryDomain} onChange={(e) => u("treasuryDomain", e.target.value)} />
          </Field>

          <div className="md:col-span-2 space-y-3 rounded-2xl border border-border bg-card/60 p-4 shadow-xs">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              <ShieldCheck className="h-4 w-4" /> Pipeline de sécurité anti-falsification
            </p>
            <div className="space-y-2 text-xs">
              <Check label="Prénom + nom (Partie versante)" checked disabled />
              <Check label="Code TP entre parenthèses" checked={rules.requireTpCodeMatch} onChange={(v) => u("requireTpCodeMatch", v)} />
              <Check label="Année dans période académique" checked={rules.requireYearMatch} onChange={(v) => u("requireYearMatch", v)} />
              <Check label="Montant conforme au TP" checked disabled />
              <Check label="Cohérence des montants (anti-falsification)" checked={rules.requireAmountConsistency} onChange={(v) => u("requireAmountConsistency", v)} />
              <Check label="Détecter & refuser les retouches/outils de modification (ICUID, PDF24, Photoshop...)" checked={rules.requireNoModificationSoftware ?? true} onChange={(v) => u("requireNoModificationSoftware", v)} />
              <Check label="Vérifier la signature numérique PKI/X.509" checked={rules.requirePkiCheck ?? false} onChange={(v) => u("requirePkiCheck", v)} />
              <Check label="Exiger une structure texte vectorielle (Anti-images raster)" checked={rules.requireVectorStructure ?? true} onChange={(v) => u("requireVectorStructure", v)} />
              <Check label="Domaine QR Trésor conforme" checked={rules.requireQrCode} onChange={(v) => u("requireQrCode", v)} />
              <Check label="Mentions officielles Trésor" checked={rules.requireOfficialLogo} onChange={(v) => u("requireOfficialLogo", v)} />
            </div>
          </div>

          {msg && (
            <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 md:col-span-2">
              <CheckCircle2 className="h-4 w-4" /> {msg}
            </p>
          )}

          <Button className="md:col-span-2 w-fit h-11 px-6 font-bold" onClick={save} disabled={saving}>
            <Save className="mr-2 h-4 w-4" /> {saving ? "Enregistrement..." : "Enregistrer les règles"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted">{label}</Label>
      {children}
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2.5 text-sm font-medium text-foreground/90 cursor-pointer hover:text-foreground">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled || !onChange}
        onChange={(e) => onChange?.(e.target.checked)}
        className="h-4 w-4 rounded border-border text-primary accent-primary focus:ring-primary/20"
      />
      <span>{label}</span>
    </label>
  );
}

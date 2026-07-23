import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/admin-ui";
import { Save } from "lucide-react";

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
    setMsg("Paramètres enregistrés.");
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
    <div className="animate-fade-in">
      <PageHeader title="Paramètres de validation" description="Règles appliquées à chaque quittance Trésor" />

      <Card className="glass-panel max-w-2xl">
        <CardHeader>
          <CardTitle className="text-foreground">Contrôles automatiques</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Année académique">
            <Input className="bg-secondary" value={rules.academicYear} onChange={(e) => u("academicYear", e.target.value)} />
          </Field>
          <Field label="Montant par défaut (FCFA)">
            <Input className="bg-secondary" type="number" value={rules.expectedAmount} onChange={(e) => u("expectedAmount", +e.target.value)} />
          </Field>
          <Field label="Intitulé paiement">
            <Input className="bg-secondary" value={rules.paymentTitle} onChange={(e) => u("paymentTitle", e.target.value)} />
          </Field>
          <Field label="Domaine QR Trésor">
            <Input className="bg-secondary" value={rules.treasuryDomain} onChange={(e) => u("treasuryDomain", e.target.value)} />
          </Field>

          <div className="md:col-span-2 space-y-2 rounded-xl border border-border bg-secondary/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Pipeline de vérification</p>
            <Check label="Prénom + nom (Partie versante)" checked disabled />
            <Check label="Code TP entre parenthèses" checked={rules.requireTpCodeMatch} onChange={(v) => u("requireTpCodeMatch", v)} />
            <Check label="Année dans période académique" checked={rules.requireYearMatch} onChange={(v) => u("requireYearMatch", v)} />
            <Check label="Montant conforme au TP" checked disabled />
            <Check label="QR Trésor obligatoire" checked={rules.requireQrCode} onChange={(v) => u("requireQrCode", v)} />
            <Check label="Mentions officielles Trésor" checked={rules.requireOfficialLogo} onChange={(v) => u("requireOfficialLogo", v)} />
          </div>

          {msg && <p className="text-sm text-success md:col-span-2">{msg}</p>}
          <Button className="md:col-span-2 w-fit" onClick={save} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted">{label}</Label>
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
    <label className="flex items-center gap-2 text-sm text-foreground/90">
      <input type="checkbox" checked={checked} disabled={disabled || !onChange} onChange={(e) => onChange?.(e.target.checked)} className="accent-primary" />
      {label}
    </label>
  );
}

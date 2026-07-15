import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save } from "lucide-react";
import { AdminLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { adminFetch } from "@/lib/api";

type Rules = {
  expectedAmount: number;
  academicYear: string;
  treasuryAccountNumber: string;
  paymentTitle: string;
  allowedDateFrom: string | null;
  allowedDateTo: string | null;
  treasuryDomain: string;
  requireQrCode: boolean;
  requireOfficialLogo: boolean;
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const [rules, setRules] = useState<Rules | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    adminFetch<Rules>("/api/admin/settings")
      .then(setRules)
      .catch(() => navigate("/admin/login"));
  }, [navigate]);

  const update = (key: keyof Rules, value: string | number | boolean) => {
    setRules((r) => (r ? { ...r, [key]: value } : r));
  };

  const save = async () => {
    if (!rules) return;
    setSaving(true);
    setMessage("");
    try {
      await adminFetch("/api/admin/settings", { method: "PUT", body: JSON.stringify(rules) });
      setMessage("Paramètres enregistrés avec succès.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    navigate("/admin/login");
  };

  if (!rules) return <AdminLayout onLogout={logout}><div>Chargement...</div></AdminLayout>;

  return (
    <AdminLayout onLogout={logout}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Paramètres de validation</h1>
        <p className="text-muted">Modifiez les critères sans toucher au code</p>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Règles métier</CardTitle>
          <CardDescription>Ces paramètres sont appliqués à chaque nouvelle vérification.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Montant attendu (FCFA)">
            <Input type="number" value={rules.expectedAmount} onChange={(e) => update("expectedAmount", Number(e.target.value))} />
          </Field>
          <Field label="Année académique">
            <Input value={rules.academicYear} onChange={(e) => update("academicYear", e.target.value)} />
          </Field>
          <Field label="N° compte Trésor">
            <Input value={rules.treasuryAccountNumber} onChange={(e) => update("treasuryAccountNumber", e.target.value)} />
          </Field>
          <Field label="Intitulé du paiement">
            <Input value={rules.paymentTitle} onChange={(e) => update("paymentTitle", e.target.value)} />
          </Field>
          <Field label="Date autorisée (début)">
            <Input type="date" value={rules.allowedDateFrom ?? ""} onChange={(e) => update("allowedDateFrom", e.target.value || null)} />
          </Field>
          <Field label="Date autorisée (fin)">
            <Input type="date" value={rules.allowedDateTo ?? ""} onChange={(e) => update("allowedDateTo", e.target.value || null)} />
          </Field>
          <Field label="Domaine QR Trésor">
            <Input value={rules.treasuryDomain} onChange={(e) => update("treasuryDomain", e.target.value)} />
          </Field>

          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" checked={rules.requireQrCode} onChange={(e) => update("requireQrCode", e.target.checked)} />
            Exiger un QR Code officiel du Trésor
          </label>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" checked={rules.requireOfficialLogo} onChange={(e) => update("requireOfficialLogo", e.target.checked)} />
            Exiger la détection du logo officiel
          </label>

          {message && <p className="text-sm text-primary md:col-span-2">{message}</p>}

          <div className="md:col-span-2">
            <Button onClick={save} disabled={saving}>
              <Save className="h-4 w-4" /> {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

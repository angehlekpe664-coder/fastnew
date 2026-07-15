import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Loader2 } from "lucide-react";
import { PublicLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { verifyQuittance } from "@/lib/api";

export default function VerifyPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    faculte: "Faculté des Sciences",
    departement: "",
    filiere: "MIA",
    niveau: "1",
    matiere: "",
  });

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("Veuillez joindre votre quittance (PDF ou image).");
      return;
    }

    setLoading(true);
    try {
      const result = await verifyQuittance({ ...form, quittance: file });
      navigate("/resultat", { state: { result } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-10 animate-fade-in">
        <Card>
          <CardHeader>
            <CardTitle>Vérification de quittance</CardTitle>
            <CardDescription>
              Renseignez vos informations académiques et importez votre quittance du Trésor Public.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom *</Label>
                  <Input id="nom" required value={form.nom} onChange={(e) => update("nom", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom(s) *</Label>
                  <Input id="prenom" required value={form.prenom} onChange={(e) => update("prenom", e.target.value)} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Faculté *</Label>
                  <Input required value={form.faculte} onChange={(e) => update("faculte", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Département *</Label>
                  <Input required value={form.departement} onChange={(e) => update("departement", e.target.value)} placeholder="Ex: Informatique" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Filière *</Label>
                  <Select required value={form.filiere} onChange={(e) => update("filiere", e.target.value)}>
                    <option value="MIA">MIA</option>
                    <option value="PC">PC</option>
                    <option value="CBG">CBG</option>
                    <option value="ENT">ENT</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Niveau *</Label>
                  <Select required value={form.niveau} onChange={(e) => update("niveau", e.target.value)}>
                    <option value="1">Niveau 1</option>
                    <option value="2">Niveau 2</option>
                    <option value="3">Niveau 3</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Matière (optionnel)</Label>
                  <Input value={form.matiere} onChange={(e) => update("matiere", e.target.value)} placeholder="Ex: Physique" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Quittance (PDF ou image) *</Label>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-secondary/40 px-6 py-10 transition hover:border-primary">
                  <Upload className="mb-3 h-8 w-8 text-primary" />
                  <span className="text-sm font-medium">
                    {file ? file.name : "Cliquez pour sélectionner un fichier"}
                  </span>
                  <span className="mt-1 text-xs text-muted">PDF, JPG, PNG — max 10 Mo</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,image/jpeg,image/png,image/webp"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Vérification en cours...</> : "Vérifier"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Loader2, User, BookOpen, FileCheck, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { PublicLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { verifyQuittance, fetchTp, type TpInfo } from "@/lib/api";
import { formatAmount } from "@/lib/utils";

const STEPS = ["Identité", "TP", "Quittance"];

export default function VerifyPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [tpInfo, setTpInfo] = useState<TpInfo | null>(null);
  const [form, setForm] = useState({ nom: "", prenom: "", matricule: "", filiere: "MIA", codeTp: "" });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (form.codeTp.length < 4) { setTpInfo(null); return; }
    const t = setTimeout(async () => {
      const tp = await fetchTp(form.codeTp);
      setTpInfo(tp);
      if (tp) update("filiere", tp.filiere);
    }, 400);
    return () => clearTimeout(t);
  }, [form.codeTp]);

  const canNext = () => {
    if (step === 0) return form.nom && form.prenom && form.matricule.length >= 4;
    if (step === 1) return tpInfo !== null;
    return Boolean(file);
  };

  const handleSubmit = async () => {
    if (!file || !tpInfo) return;
    setLoading(true);
    setError("");
    try {
      const result = await verifyQuittance({ ...form, codeTp: tpInfo.code, quittance: file });
      navigate("/resultat", { state: { result } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-lg px-4 py-8 animate-fade-in">
        {/* Progress */}
        <div className="mb-8 flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition ${
                i <= step ? "bg-primary text-white" : "bg-secondary text-muted"
              }`}>{i + 1}</div>
              <span className={`ml-2 hidden text-xs font-medium sm:inline ${i <= step ? "text-foreground" : "text-muted"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`mx-2 h-0.5 flex-1 ${i < step ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-6">
            {step === 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <User className="h-5 w-5" />
                  <h2 className="text-lg font-bold">Qui êtes-vous ?</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Nom</Label>
                    <Input placeholder="HLEKPE" value={form.nom} onChange={(e) => update("nom", e.target.value.toUpperCase())} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Prénom(s)</Label>
                    <Input placeholder="Ange" value={form.prenom} onChange={(e) => update("prenom", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Matricule</Label>
                  <Input placeholder="Ex: 22A045" value={form.matricule} onChange={(e) => update("matricule", e.target.value.toUpperCase())} />
                </div>
                <div className="space-y-1.5">
                  <Label>Filière</Label>
                  <Select value={form.filiere} onChange={(e) => update("filiere", e.target.value)}>
                    <option value="MIA">MIA — Math & Info</option>
                    <option value="PC">PC — Physique Chimie</option>
                    <option value="CBG">CBG — Bio & Géo</option>
                  </Select>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <BookOpen className="h-5 w-5" />
                  <h2 className="text-lg font-bold">Quel TP ?</h2>
                </div>
                <div className="space-y-1.5">
                  <Label>Code du TP</Label>
                  <Input
                    placeholder="Ex: PHY1121, CHM1226-1..."
                    value={form.codeTp}
                    onChange={(e) => update("codeTp", e.target.value.toUpperCase())}
                    className="font-mono text-lg tracking-wide"
                  />
                </div>
                {tpInfo && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge variant="success">{tpInfo.code}</Badge>
                        <p className="mt-2 font-semibold">{tpInfo.title}</p>
                        <p className="text-sm text-muted">Filière {tpInfo.filiere}</p>
                      </div>
                      <p className="text-lg font-bold text-primary">{formatAmount(tpInfo.montant)}</p>
                    </div>
                  </div>
                )}
                {form.codeTp.length >= 4 && !tpInfo && (
                  <p className="text-sm text-danger">Code TP non reconnu. Vérifiez l'orthographe.</p>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <FileCheck className="h-5 w-5" />
                  <h2 className="text-lg font-bold">Votre quittance</h2>
                </div>
                <p className="text-sm text-muted">
                  Importez le PDF ou la photo de votre quittance du <strong>Trésor Public</strong>.
                </p>
                <label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-primary/30 bg-secondary/30 px-6 py-12 transition hover:border-primary hover:bg-secondary/60">
                  <Upload className="mb-2 h-10 w-10 text-primary" />
                  <span className="text-sm font-medium">{file ? file.name : "PDF ou image"}</span>
                  <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </label>
                {loading && (
                  <div className="space-y-2 rounded-xl bg-secondary/50 p-4 text-sm">
                    {["Lecture du document...", "Extraction QR & montant...", "Validation des règles..."].map((t, i) => (
                      <div key={t} className="flex items-center gap-2 text-muted">
                        <Sparkles className={`h-3.5 w-3.5 ${i === 0 ? "animate-pulse text-primary" : ""}`} /> {t}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}

            <div className="mt-6 flex gap-3">
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep(step - 1)} disabled={loading}>
                  <ChevronLeft className="h-4 w-4" /> Retour
                </Button>
              )}
              {step < 2 ? (
                <Button className="flex-1" disabled={!canNext()} onClick={() => setStep(step + 1)}>
                  Continuer <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button className="flex-1" disabled={!canNext() || loading} onClick={handleSubmit}>
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyse...</> : "Vérifier ma quittance"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}

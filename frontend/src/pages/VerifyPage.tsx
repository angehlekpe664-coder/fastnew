import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Loader2, User, BookOpen, FileCheck, ChevronRight, ChevronLeft, Sparkles, Camera } from "lucide-react";
import { PublicLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { verifyQuittance, fetchActiveTps, clearTpListCache, type TpInfo } from "@/lib/api";
import { formatAmount } from "@/lib/utils";

const STEPS = ["Identité", "TP", "Quittance"];

export default function VerifyPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [tpList, setTpList] = useState<TpInfo[]>([]);
  const [tpLoading, setTpLoading] = useState(false);
  const [tpInfo, setTpInfo] = useState<TpInfo | null>(null);
  const [form, setForm] = useState({ nom: "", prenom: "", matricule: "", filiere: "MIA", codeTp: "" });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    setForm((f) => ({ ...f, codeTp: "" }));
    setTpInfo(null);
  }, [form.filiere]);

  useEffect(() => {
    if (step !== 1) return;
    setTpLoading(true);
    clearTpListCache();
    fetchActiveTps(form.filiere, true)
      .then((list) => {
        setTpList(list);
      })
      .finally(() => setTpLoading(false));
  }, [step, form.filiere]);

  const tpOptions = useMemo(() => tpList, [tpList]);

  const selectTp = (code: string) => {
    update("codeTp", code);
    const found = tpList.find((tp) => tp.code === code) ?? null;
    setTpInfo(found);
    if (found) update("filiere", found.filiere);
  };

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
      const result = await verifyQuittance({ ...form, codeTp: tpInfo.code, filiere: tpInfo.filiere, quittance: file });
      navigate("/resultat", { state: { result } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const pickFile = (picked: File | null) => {
    setFile(picked);
    setError("");
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-lg animate-fade-in px-4 pb-28 pt-4 sm:py-8 sm:pb-8">
        <div className="mb-5 sm:mb-8">
          <p className="text-center text-sm font-semibold text-primary sm:hidden">
            Étape {step + 1} / {STEPS.length} — {STEPS[step]}
          </p>
          <div className="mt-3 flex items-center justify-between sm:mt-0">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-1 items-center">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold transition sm:h-9 sm:w-9 ${
                    i <= step ? "bg-primary text-white shadow-sm shadow-primary/30" : "bg-secondary text-muted"
                  }`}
                >
                  {i + 1}
                </div>
                <span className={`ml-2 hidden text-xs font-medium sm:inline ${i <= step ? "text-foreground" : "text-muted"}`}>
                  {s}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={`mx-1.5 h-0.5 flex-1 sm:mx-2 ${i < step ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <Card className="overflow-hidden border-border/80 shadow-sm">
          <CardContent className="space-y-4 p-4 sm:p-6">
            {step === 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <User className="h-5 w-5 shrink-0" />
                  <h2 className="text-lg font-bold">Qui êtes-vous ?</h2>
                </div>
                <div className="grid gap-3">
                  <div className="space-y-1.5">
                    <Label>Nom</Label>
                    <Input
                      placeholder="HLEKPE"
                      autoComplete="family-name"
                      enterKeyHint="next"
                      value={form.nom}
                      onChange={(e) => update("nom", e.target.value.toUpperCase())}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Prénom(s)</Label>
                    <Input
                      placeholder="Ange"
                      autoComplete="given-name"
                      enterKeyHint="next"
                      value={form.prenom}
                      onChange={(e) => update("prenom", e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Matricule</Label>
                  <Input
                    placeholder="Ex: 22A045"
                    autoComplete="off"
                    enterKeyHint="next"
                    value={form.matricule}
                    onChange={(e) => update("matricule", e.target.value.toUpperCase())}
                  />
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
                  <BookOpen className="h-5 w-5 shrink-0" />
                  <h2 className="text-lg font-bold">Quel TP ?</h2>
                </div>
                <p className="text-sm leading-relaxed text-muted">
                  Choisissez parmi les TP ouverts pour la filière <strong>{form.filiere}</strong>.
                </p>
                <div className="space-y-1.5">
                  <Label>Travaux pratiques</Label>
                  {tpLoading ? (
                    <div className="flex min-h-12 items-center rounded-xl border border-border bg-secondary px-4 text-sm text-muted">
                      Chargement des TP...
                    </div>
                  ) : tpOptions.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                      Aucun TP actif pour cette filière pour le moment.
                    </div>
                  ) : (
                    <Select value={form.codeTp} onChange={(e) => selectTp(e.target.value)} className="font-mono">
                      <option value="">— Sélectionnez un TP —</option>
                      {tpOptions.map((tp) => (
                        <option key={tp.code} value={tp.code}>
                          {tp.code} — {tp.title} ({formatAmount(tp.montant)})
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
                {tpInfo && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <Badge variant="success">{tpInfo.code}</Badge>
                        <p className="mt-2 font-semibold">{tpInfo.title}</p>
                        <p className="text-sm text-muted">Filière {tpInfo.filiere}</p>
                      </div>
                      <p className="text-xl font-bold text-primary sm:text-lg">{formatAmount(tpInfo.montant)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <FileCheck className="h-5 w-5 shrink-0" />
                  <h2 className="text-lg font-bold">Votre quittance</h2>
                </div>
                <p className="text-sm leading-relaxed text-muted">
                  Importez le PDF ou une photo nette de votre quittance du <strong>Trésor Public</strong>.
                </p>
                <div className="space-y-2 rounded-xl bg-secondary/50 p-3 text-xs text-muted sm:p-4">
                  {["Prénom + nom (Partie versante)", `Code TP (${tpInfo?.code ?? "…"})`, "Année académique", "Montant", "QR Trésor"].map((t) => (
                    <div key={t} className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" /> {t}
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-1">
                  <label className="flex min-h-[140px] cursor-pointer touch-manipulation flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/30 bg-secondary/30 px-4 py-8 transition active:scale-[0.99] hover:border-primary hover:bg-secondary/60">
                    <Upload className="mb-2 h-10 w-10 text-primary" />
                    <span className="text-center text-sm font-medium">
                      {file ? file.name : "Choisir un PDF ou une image"}
                    </span>
                    <span className="mt-1 text-xs text-muted">Depuis vos fichiers ou galerie</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,image/*"
                      onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                    />
                  </label>

                  <label className="flex min-h-12 cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition active:scale-[0.99] hover:bg-secondary sm:hidden">
                    <Camera className="h-4 w-4 text-primary" />
                    Prendre une photo
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>

                {loading && (
                  <div className="space-y-2 rounded-xl bg-secondary/50 p-4 text-sm">
                    {["Lecture du document...", "Extraction QR & montant...", "Validation des règles..."].map((t, i) => (
                      <div key={t} className="flex items-center gap-2 text-muted">
                        <Sparkles className={`h-3.5 w-3.5 shrink-0 ${i === 0 ? "animate-pulse text-primary" : ""}`} /> {t}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2.5 text-sm leading-relaxed text-red-700 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Barre d'actions fixe sur mobile */}
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-4 backdrop-blur-md sm:static sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0">
          <div className="mx-auto flex max-w-lg gap-3">
            {step > 0 && (
              <Button variant="outline" className="min-w-[96px]" onClick={() => setStep(step - 1)} disabled={loading}>
                <ChevronLeft className="h-4 w-4" /> Retour
              </Button>
            )}
            {step < 2 ? (
              <Button className="flex-1" disabled={!canNext()} onClick={() => setStep(step + 1)}>
                Continuer <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button className="flex-1" disabled={!canNext() || loading} onClick={handleSubmit}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Analyse...
                  </>
                ) : (
                  "Vérifier ma quittance"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

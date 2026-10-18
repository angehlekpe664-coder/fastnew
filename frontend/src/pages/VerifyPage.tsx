import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  User,
  BookOpen,
  FileCheck,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  FileText,
  X,
  AlertCircle,
} from "lucide-react";
import { PublicLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { verifyQuittance, fetchActiveTps, clearTpListCache, type TpInfo } from "@/lib/api";
import { formatAmount } from "@/lib/utils";

const STEPS = ["Identité", "TP", "Quittance PDF"];

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
    if (step === 0) return form.nom.trim().length >= 2 && form.prenom.trim().length >= 2 && form.matricule.trim().length >= 4;
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
      setError(e instanceof Error ? e.message : "Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  const pickFile = (picked: File | null) => {
    setError("");
    if (picked) {
      const isPdf =
        picked.type === "application/pdf" || picked.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        setError(
          "Format refusé. Seuls les fichiers PDF originaux téléchargés sur le portail du Trésor Public sont acceptés. Les photos et captures d'écran ne sont pas autorisées."
        );
        setFile(null);
        return;
      }
      if (picked.size > 10 * 1024 * 1024) {
        setError("Le fichier PDF dépasse la taille maximale autorisée (10 Mo).");
        setFile(null);
        return;
      }
    }
    setFile(picked);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-lg animate-fade-in px-4 pb-28 pt-4 sm:py-8 sm:pb-8">
        {/* Indicateur d'étape optimisé Mobile */}
        <div className="mb-5 sm:mb-8">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-primary sm:hidden">
            Étape {step + 1} sur {STEPS.length} — {STEPS[step]}
          </p>
          <div className="mt-2.5 flex items-center justify-between sm:mt-0">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-1 items-center">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition sm:h-9 sm:w-9 ${
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
            {/* ÉTAPE 1: IDENTITÉ */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <User className="h-5 w-5 shrink-0" />
                  <h2 className="text-lg font-bold">Informations de l'étudiant</h2>
                </div>
                <div className="grid gap-3">
                  <div className="space-y-1.5">
                    <Label>Nom de famille</Label>
                    <Input
                      placeholder="Ex: ACCROMBESSY"
                      autoComplete="family-name"
                      enterKeyHint="next"
                      value={form.nom}
                      onChange={(e) => update("nom", e.target.value.toUpperCase())}
                      className="h-11 text-base sm:h-10 sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Prénom(s)</Label>
                    <Input
                      placeholder="Ex: Branel Vianney"
                      autoComplete="given-name"
                      enterKeyHint="next"
                      value={form.prenom}
                      onChange={(e) => update("prenom", e.target.value)}
                      className="h-11 text-base sm:h-10 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Matricule étudiant</Label>
                  <Input
                    placeholder="Ex: INF1421"
                    autoComplete="off"
                    enterKeyHint="next"
                    value={form.matricule}
                    onChange={(e) => update("matricule", e.target.value.toUpperCase())}
                    className="h-11 font-mono text-base tracking-wider uppercase sm:h-10 sm:text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Filière</Label>
                  <Select
                    value={form.filiere}
                    onChange={(e) => update("filiere", e.target.value)}
                    className="h-11 text-base font-medium sm:h-10 sm:text-sm"
                  >
                    <option value="MIA">MIA — Mathématiques, Informatique & Applications</option>
                    <option value="PC">PC — Physique & Chimie</option>
                    <option value="CBG">CBG — Chimie, Biologie & Géologie</option>
                  </Select>
                </div>
              </div>
            )}

            {/* ÉTAPE 2: SÉLECTION DU TP */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <BookOpen className="h-5 w-5 shrink-0" />
                  <h2 className="text-lg font-bold">Sélection du TP</h2>
                </div>
                <p className="text-sm leading-relaxed text-muted">
                  Sélectionnez le travail pratique pour la filière <strong>{form.filiere}</strong>.
                </p>
                <div className="space-y-1.5">
                  <Label>Travaux pratiques ouverts</Label>
                  {tpLoading ? (
                    <div className="flex h-12 items-center justify-center rounded-xl border border-border bg-secondary px-4 text-sm text-muted">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" /> Chargement des TP disponibles...
                    </div>
                  ) : tpOptions.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                      Aucun TP actif répertorié pour la filière {form.filiere}. Vous pouvez sélectionner une autre filière.
                    </div>
                  ) : (
                    <Select
                      value={form.codeTp}
                      onChange={(e) => selectTp(e.target.value)}
                      className="h-12 font-mono text-sm sm:h-11"
                    >
                      <option value="">— Choisir un TP dans la liste —</option>
                      {tpOptions.map((tp) => (
                        <option key={tp.code} value={tp.code}>
                          {tp.code} — {tp.title} ({formatAmount(tp.montant)})
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
                {tpInfo && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Badge variant="success" className="font-mono text-xs">
                          {tpInfo.code}
                        </Badge>
                        <p className="mt-1.5 font-bold text-foreground">{tpInfo.title}</p>
                        <p className="text-xs text-muted">Filière {tpInfo.filiere}</p>
                      </div>
                      <p className="text-lg font-bold text-primary">{formatAmount(tpInfo.montant)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ÉTAPE 3: TÉLÉVERSEMENT EXCLUSIF PDF */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <FileCheck className="h-5 w-5 shrink-0" />
                  <h2 className="text-lg font-bold">Quittance PDF originale</h2>
                </div>

                {/* Avertissement clair PDF strict */}
                <div className="flex items-start gap-2.5 rounded-2xl border border-primary/30 bg-primary/10 p-3.5 text-xs leading-relaxed text-foreground">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <span className="font-bold">Important :</span> Seuls les fichiers au format <strong>PDF</strong> téléchargés depuis le portail du Trésor Public sont acceptés.
                    Les captures d'écran, photos ou images scannées sont automatiquement refusées.
                  </div>
                </div>

                {!file ? (
                  <div className="grid gap-3">
                    {/* Zone de sélection de fichier PDF */}
                    <label className="flex min-h-[140px] cursor-pointer touch-manipulation flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-6 transition active:scale-[0.99] hover:border-primary hover:bg-primary/10">
                      <FileText className="mb-2 h-10 w-10 text-primary" />
                      <span className="text-center text-sm font-bold text-foreground">
                        Sélectionner le fichier PDF de la quittance
                      </span>
                      <span className="mt-1 text-xs text-muted">Document .PDF uniquement (max 10 Mo)</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="application/pdf,.pdf"
                        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>
                ) : (
                  /* Fichier PDF sélectionné - Aperçu */
                  <div className="rounded-2xl border border-emerald-500/40 bg-emerald-50/60 p-4 shadow-sm dark:bg-emerald-950/30">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                          <FileText className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-foreground">{file.name}</p>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                            <span>{formatFileSize(file.size)}</span>
                            <span>•</span>
                            <Badge variant="success" className="px-1.5 py-0 text-[10px]">
                              DOCUMENT PDF
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFile(null)}
                        className="h-8 w-8 rounded-full p-0 text-muted hover:text-danger"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {loading && (
                  <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-primary">
                      <Loader2 className="h-4 w-4 animate-spin" /> Analyse forensique du PDF en cours...
                    </div>
                    {[
                      "Analyse de la structure PDF originale",
                      "Contrôle anti-falsification bas niveau",
                      "Vérification des filigranes & certificats",
                      "Validation en ligne auprès du Trésor Public",
                    ].map((t) => (
                      <div key={t} className="flex items-center gap-2 text-muted pl-6">
                        <Sparkles className="h-3 w-3 shrink-0 text-primary" /> {t}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium leading-relaxed text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Barre d'action fixe sous les pouces sur smartphone */}
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-4 backdrop-blur-md sm:static sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0">
          <div className="mx-auto flex max-w-lg gap-3">
            {step > 0 && (
              <Button
                variant="outline"
                className="h-12 min-w-[100px] text-sm font-semibold sm:h-11"
                onClick={() => setStep(step - 1)}
                disabled={loading}
              >
                <ChevronLeft className="h-4 w-4" /> Retour
              </Button>
            )}
            {step < 2 ? (
              <Button
                className="h-12 flex-1 text-sm font-semibold shadow-md shadow-primary/20 sm:h-11"
                disabled={!canNext()}
                onClick={() => setStep(step + 1)}
              >
                Continuer <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                className="h-12 flex-1 text-sm font-semibold shadow-lg shadow-primary/25 sm:h-11"
                disabled={!canNext() || loading}
                onClick={handleSubmit}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Vérification...
                  </>
                ) : (
                  "Vérifier mon PDF"
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

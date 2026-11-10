import { useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Skeleton } from "@/components/ui/admin-ui";
import { BookOpen, Plus, Power, PowerOff, Filter, Search } from "lucide-react";
import { loadDraft, saveDraft, clearDraft } from "@/lib/draft";

type TpRow = {
  code: string;
  title: string;
  filiere: string;
  montant: number;
  actif: boolean;
};

const DRAFT_KEY = "tp-catalog-form";
const emptyForm = { code: "", title: "", filiere: "MIA", montant: 1000 };

export default function TpCatalogPage() {
  const [rows, setRows] = useState<TpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => loadDraft(DRAFT_KEY, emptyForm));
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [selectedFiliere, setSelectedFiliere] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch<TpRow[]>("/api/admin/tp-catalog");
      setRows(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    saveDraft(DRAFT_KEY, form);
  }, [form]);

  useEffect(() => {
    const reload = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", reload);
    return () => document.removeEventListener("visibilitychange", reload);
  }, [load]);

  const filieres = useMemo(
    () => Array.from(new Set(rows.map((r) => r.filiere.toUpperCase()))).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    let list = rows;
    if (filter === "active") list = list.filter((r) => r.actif);
    if (filter === "inactive") list = list.filter((r) => !r.actif);
    if (selectedFiliere) {
      list = list.filter((r) => r.filiere.toUpperCase() === selectedFiliere.toUpperCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.code.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.filiere.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, filter, selectedFiliere, searchQuery]);

  const activeCount = rows.filter((r) => r.actif).length;

  const mergeRow = (list: TpRow[], row: TpRow) => {
    const exists = list.some((r) => r.code === row.code);
    const next = exists ? list.map((r) => (r.code === row.code ? row : r)) : [...list, row];
    return next.sort((a, b) => a.code.localeCompare(b.code));
  };

  const saveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (!form.code.trim() || !form.title.trim()) {
      setErr("Code et intitulé obligatoires.");
      return;
    }
    setSaving(true);
    try {
      const created = await adminFetch<TpRow>("/api/admin/tp-catalog", {
        method: "POST",
        body: JSON.stringify({ ...form, code: form.code.toUpperCase(), actif: true }),
      });
      setRows((prev) => mergeRow(prev, created));
      setForm(emptyForm);
      clearDraft(DRAFT_KEY);
      setMsg(`TP ${created.code} ajouté — vérifiable immédiatement.`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur";
      if (message.includes("Session expirée")) {
        setErr("Session expirée — vos saisies sont conservées. Reconnectez-vous puis réessayez.");
      } else {
        setErr(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (row: TpRow) => {
    const nextActif = !row.actif;
    setErr("");
    setMsg("");
    setRows((prev) => prev.map((r) => (r.code === row.code ? { ...r, actif: nextActif } : r)));
    try {
      const updated = await adminFetch<TpRow>(`/api/admin/tp-catalog/${encodeURIComponent(row.code)}`, {
        method: "PATCH",
        body: JSON.stringify({ actif: nextActif }),
      });
      if (updated.actif !== nextActif) {
        throw new Error("Le serveur n'a pas confirmé le changement de statut.");
      }
      setRows((prev) => mergeRow(prev, updated));
      await load();
      setMsg(
        updated.actif
          ? `TP ${row.code} activé — visible sur le site public immédiatement.`
          : `TP ${row.code} désactivé.`
      );
    } catch (e) {
      setRows((prev) => prev.map((r) => (r.code === row.code ? row : r)));
      setErr(e instanceof Error ? e.message : "Impossible de modifier le statut.");
    }
  };

  const updateMontant = async (row: TpRow, montant: number) => {
    if (montant === row.montant || montant < 100) return;
    try {
      const updated = await adminFetch<TpRow>(`/api/admin/tp-catalog/${encodeURIComponent(row.code)}`, {
        method: "PATCH",
        body: JSON.stringify({ montant }),
      });
      setRows((prev) => mergeRow(prev, updated));
    } catch (e) {
      setErr(e instanceof Error ? e.message : `Échec mise à jour montant ${row.code}.`);
    }
  };

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        title="Codes TP vérifiables"
        description={`${activeCount} TP actif(s) sur ${rows.length} répertorié(s)`}
      />

      {/* Formulaire d'ajout d'un nouveau Code TP */}
      <Card className="glass-panel border-amber-500/20 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <Plus className="h-5 w-5 text-amber-600 dark:text-amber-400" /> Ajouter un nouveau Code TP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveNew} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Code TP">
              <Input
                className="border-border bg-card font-mono font-bold uppercase"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="PHY1322"
                required
              />
            </Field>
            <Field label="Filière">
              <Select
                className="border-border bg-card font-semibold"
                value={form.filiere}
                onChange={(e) => setForm({ ...form, filiere: e.target.value })}
              >
                <option value="MIA">MIA</option>
                <option value="PC">PC</option>
                <option value="CBG">CBG</option>
              </Select>
            </Field>
            <Field label="Intitulé du TP">
              <Input
                className="border-border bg-card"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Mécanique Expérimentale"
                required
              />
            </Field>
            <Field label="Montant (FCFA)">
              <Input
                className="border-border bg-card font-bold"
                type="number"
                min={100}
                value={form.montant}
                onChange={(e) => setForm({ ...form, montant: +e.target.value })}
              />
            </Field>
            <div className="flex items-end">
              <Button type="submit" className="w-full h-10 font-semibold" disabled={saving}>
                {saving ? "Ajout..." : "Activer le TP"}
              </Button>
            </div>
          </form>
          {msg && <p className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">{msg}</p>}
          {err && <p className="mt-3 text-xs font-semibold text-rose-600 dark:text-rose-400">{err}</p>}
        </CardContent>
      </Card>

      {/* Barre de filtrage avancée par Filière & Statut */}
      <div className="glass-panel rounded-2xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            <Filter className="h-4 w-4" /> FILTRER LE CATALOGUE :
          </div>

          {/* Filtre par Statut */}
          <div className="flex items-center gap-1.5">
            {(["all", "active", "inactive"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  filter === f
                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40"
                    : "bg-card border border-border text-muted hover:text-foreground"
                }`}
              >
                {f === "all" ? "Tous" : f === "active" ? "Actifs" : "Inactifs"}
              </button>
            ))}
          </div>

          {/* Filtre par Filière */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted">Filière :</span>
            <select
              value={selectedFiliere}
              onChange={(e) => setSelectedFiliere(e.target.value)}
              className="h-9 rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground outline-none focus:border-amber-500 shadow-xs"
            >
              <option value="">Toutes filières ({rows.length})</option>
              {filieres.map((f) => {
                const count = rows.filter((r) => r.filiere.toUpperCase() === f).length;
                return (
                  <option key={f} value={f}>
                    Filière {f} ({count} TP)
                  </option>
                );
              })}
            </select>
          </div>

          {(selectedFiliere || searchQuery || filter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilter("all");
                setSelectedFiliere("");
                setSearchQuery("");
              }}
              className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400"
            >
              Réinitialiser
            </Button>
          )}

          {/* Champ de recherche rapide par code / titre */}
          <div className="relative ml-auto min-w-[220px] flex-1 sm:flex-initial">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              className="bg-card pl-9 shadow-xs"
              placeholder="Rechercher code TP ou titre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Liste des TP filtrés */}
      <Card className="glass-panel border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base font-bold text-foreground">
            <span className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-amber-600 dark:text-amber-400" /> Catalogue des TP
            </span>
            <Badge variant="secondary" className="font-mono text-xs">
              {filtered.length} TP affiché(s)
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {loading &&
            [1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          {!loading && filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">Aucun TP ne correspond à ces filtres.</p>
          )}
          {!loading &&
            filtered.map((row) => (
              <div
                key={row.code}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/60 p-4 transition-all duration-200 hover:border-amber-500/30 hover:bg-card-hover shadow-xs"
              >
                <div className="min-w-[90px]">
                  <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400">{row.code}</span>
                </div>
                <div className="min-w-[140px] flex-1">
                  <div className="font-bold text-foreground text-sm">{row.title}</div>
                  <div className="text-xs font-semibold text-muted">Filière {row.filiere}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted font-medium">Prix :</span>
                  <Input
                    className="w-28 border-border bg-secondary text-xs font-bold"
                    type="number"
                    min={100}
                    defaultValue={row.montant}
                    onBlur={(e) => updateMontant(row, +e.target.value)}
                  />
                  <span className="text-xs text-muted font-medium">FCFA</span>
                </div>
                <Badge variant={row.actif ? "success" : "secondary"} className="font-bold">
                  {row.actif ? "ACTIF" : "INACTIF"}
                </Badge>
                <Button
                  variant={row.actif ? "outline" : "default"}
                  size="sm"
                  onClick={() => toggle(row)}
                  className="gap-1.5 font-semibold"
                >
                  {row.actif ? (
                    <>
                      <PowerOff className="h-3.5 w-3.5 text-rose-500" /> Désactiver
                    </>
                  ) : (
                    <>
                      <Power className="h-3.5 w-3.5 text-emerald-500" /> Activer
                    </>
                  )}
                </Button>
              </div>
            ))}
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

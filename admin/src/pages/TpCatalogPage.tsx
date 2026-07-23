import { useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Skeleton } from "@/components/ui/admin-ui";
import { BookOpen, Plus, Power, PowerOff } from "lucide-react";
import { formatAmount } from "@/lib/utils";
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

  const filtered = useMemo(() => {
    if (filter === "active") return rows.filter((r) => r.actif);
    if (filter === "inactive") return rows.filter((r) => !r.actif);
    return rows;
  }, [rows, filter]);

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
    setRows((prev) => prev.map((r) => (r.code === row.code ? { ...r, actif: nextActif } : r)));
    try {
      const updated = await adminFetch<TpRow>(`/api/admin/tp-catalog/${encodeURIComponent(row.code)}`, {
        method: "PATCH",
        body: JSON.stringify({ actif: nextActif }),
      });
      setRows((prev) => mergeRow(prev, updated));
      setMsg(nextActif ? `TP ${row.code} activé.` : `TP ${row.code} désactivé.`);
      setErr("");
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
    <div className="animate-fade-in">
      <PageHeader
        title="Codes TP vérifiables"
        description={`${activeCount} TP actif(s) — seuls les codes actifs acceptent des quittances sur le site public.`}
      />

      <Card className="glass-panel mb-6 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-foreground">
            <Plus className="h-4 w-4 text-primary" /> Ajouter un code TP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveNew} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Code TP">
              <Input
                className="border-border bg-secondary font-mono uppercase"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="PHY1322"
                required
              />
            </Field>
            <Field label="Filière">
              <Select
                className="border-border bg-secondary"
                value={form.filiere}
                onChange={(e) => setForm({ ...form, filiere: e.target.value })}
              >
                <option value="MIA">MIA</option>
                <option value="PC">PC</option>
                <option value="CBG">CBG</option>
              </Select>
            </Field>
            <Field label="Intitulé">
              <Input
                className="border-border bg-secondary"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Mécanique Expérimental"
                required
              />
            </Field>
            <Field label="Montant FCFA">
              <Input
                className="border-border bg-secondary"
                type="number"
                min={100}
                value={form.montant}
                onChange={(e) => setForm({ ...form, montant: +e.target.value })}
              />
            </Field>
            <div className="flex items-end">
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Ajout..." : "Activer le TP"}
              </Button>
            </div>
          </form>
          {msg && <p className="mt-3 text-sm text-success">{msg}</p>}
          {err && <p className="mt-3 text-sm text-danger">{err}</p>}
        </CardContent>
      </Card>

      <div className="mb-4 flex gap-2">
        {(["all", "active", "inactive"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filter === f ? "bg-primary/20 text-primary" : "bg-secondary text-muted hover:text-foreground"
            }`}
          >
            {f === "all" ? "Tous" : f === "active" ? "Actifs" : "Inactifs"}
          </button>
        ))}
      </div>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <BookOpen className="h-5 w-5 text-accent" /> Catalogue ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading &&
            [1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          {!loading && filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">Aucun TP dans cette catégorie.</p>
          )}
          {!loading &&
            filtered.map((row) => (
              <div
                key={row.code}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition hover:bg-card-hover"
              >
                <div className="min-w-[88px] font-mono text-sm font-bold text-accent">{row.code}</div>
                <div className="min-w-[140px] flex-1">
                  <div className="font-medium text-foreground">{row.title}</div>
                  <div className="text-xs text-muted">{row.filiere}</div>
                </div>
                <Input
                  className="w-28 border-border bg-secondary text-sm"
                  type="number"
                  min={100}
                  defaultValue={row.montant}
                  onBlur={(e) => updateMontant(row, +e.target.value)}
                />
                <Badge variant={row.actif ? "success" : "secondary"}>{row.actif ? "Actif" : "Inactif"}</Badge>
                <Button variant="outline" size="sm" onClick={() => toggle(row)}>
                  {row.actif ? (
                    <>
                      <PowerOff className="h-3.5 w-3.5" /> Désactiver
                    </>
                  ) : (
                    <>
                      <Power className="h-3.5 w-3.5" /> Activer
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
      <Label className="text-xs text-muted">{label}</Label>
      {children}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { adminFetch } from "@/lib/api";
import { formatAmount, formatDate } from "@/lib/utils";

type Student = {
  id: string;
  nom: string;
  prenom: string;
  faculte: string;
  departement: string;
  filiere: string;
  niveau: string;
  numeroQuittance: string;
  montant: number;
  dateVerification: string;
  validationId: string;
  statut: string;
};

export default function StudentsPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    const load = () =>
      adminFetch<Student[]>(`/api/admin/students?q=${encodeURIComponent(q)}`)
        .then(setStudents)
        .catch(() => navigate("/admin/login"));
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [q, navigate]);

  const logout = () => {
    localStorage.removeItem("admin_token");
    navigate("/admin/login");
  };

  return (
    <AdminLayout onLogout={logout}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Étudiants validés</h1>
          <p className="text-muted">{students.length} enregistrement(s)</p>
        </div>
        <Input className="max-w-sm" placeholder="Rechercher nom, quittance, filière..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <Card>
        <CardHeader><CardTitle>Liste</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="py-3 pr-4">Étudiant</th>
                <th className="py-3 pr-4">Filière</th>
                <th className="py-3 pr-4">Quittance</th>
                <th className="py-3 pr-4">Montant</th>
                <th className="py-3 pr-4">Vérification</th>
                <th className="py-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-border/70">
                  <td className="py-3 pr-4">
                    <div className="font-medium">{s.prenom} {s.nom}</div>
                    <div className="text-xs text-muted">{s.departement}</div>
                  </td>
                  <td className="py-3 pr-4">{s.filiere} — N{s.niveau}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{s.numeroQuittance}</td>
                  <td className="py-3 pr-4">{formatAmount(s.montant)}</td>
                  <td className="py-3 pr-4">{formatDate(s.dateVerification)}</td>
                  <td className="py-3"><Badge variant="success">{s.statut}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!students.length && <p className="py-8 text-center text-muted">Aucun étudiant validé.</p>}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { consumeReturnPath } from "@/lib/draft";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError(err.message);
    else navigate(consumeReturnPath("/"));
    setLoading(false);
  };

  return (
    <div className="admin-gradient flex min-h-screen items-center justify-center p-4">
      <Card className="glass-panel w-full max-w-sm animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Shield className="h-6 w-6" />
          </div>
          <CardTitle className="mt-3 text-foreground">Administration UniPay</CardTitle>
          <p className="text-xs text-muted">Accès réservé — Faculté des Sciences UAC</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-muted">Email</Label>
              <Input className="bg-secondary" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted">Mot de passe</Label>
              <Input className="bg-secondary" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button className="w-full" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

import { Navigate, Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { clearTokenCache, syncTokenFromSession, warmupAuth } from "@/lib/api";
import { saveReturnPath } from "@/lib/draft";
import { Shield, LogOut, LayoutDashboard, Users, AlertTriangle, Settings, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    warmupAuth().then((ok) => {
      setAuthed(ok);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        syncTokenFromSession(session);
        setAuthed(true);
      } else if (event === "SIGNED_OUT") {
        clearTokenCache();
        setAuthed(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Rafraîchissement silencieux quand l'onglet redevient actif
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) syncTokenFromSession(session);
      });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  if (!ready) {
    return (
      <div className="admin-gradient flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!authed) {
    if (location.pathname !== "/login") {
      saveReturnPath(location.pathname + location.search);
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function AdminShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const links = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/students", icon: Users, label: "Validés" },
    { to: "/failures", icon: AlertTriangle, label: "Échecs" },
    { to: "/tp-catalog", icon: BookOpen, label: "Codes TP" },
    { to: "/settings", icon: Settings, label: "Paramètres" },
  ];

  const logout = async () => {
    clearTokenCache();
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="admin-gradient min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="glass-panel border-r border-border p-5 lg:min-h-screen">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">UniPay Admin</div>
            <div className="text-[10px] text-muted">Faculté des Sciences — UAC</div>
          </div>
        </div>
        <nav className="space-y-1">
          {links.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-primary/15 text-primary shadow-sm shadow-primary/10"
                    : "text-muted hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            );
          })}
        </nav>
        <Button
          variant="ghost"
          className="mt-8 w-full justify-start text-danger hover:bg-danger/10 hover:text-danger"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" /> Déconnexion
        </Button>
      </aside>
      <main className="p-5 md:p-7">
        <Outlet />
      </main>
    </div>
  );
}

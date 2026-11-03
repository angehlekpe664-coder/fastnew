import { Navigate, Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { clearTokenCache, syncTokenFromSession, warmupAuth } from "@/lib/api";
import { saveReturnPath } from "@/lib/draft";
import { Shield, LogOut, LayoutDashboard, Users, AlertTriangle, Settings, BookOpen, Sun, Moon } from "lucide-react";
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
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("admin_theme");
    if (saved === "light") {
      document.documentElement.classList.remove("dark");
      setDark(false);
    } else {
      document.documentElement.classList.add("dark");
      setDark(true);
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !dark;
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("admin_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("admin_theme", "light");
    }
    setDark(nextDark);
  };

  const links = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
    { to: "/students", icon: Users, label: "Validés", color: "text-sky-600 dark:text-sky-400 bg-sky-500/10" },
    { to: "/failures", icon: AlertTriangle, label: "Échecs", color: "text-rose-600 dark:text-rose-400 bg-rose-500/10" },
    { to: "/tp-catalog", icon: BookOpen, label: "Codes TP", color: "text-amber-600 dark:text-amber-400 bg-amber-500/10" },
    { to: "/settings", icon: Settings, label: "Paramètres", color: "text-purple-600 dark:text-purple-400 bg-purple-500/10" },
  ];

  const logout = async () => {
    clearTokenCache();
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="admin-gradient min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="glass-panel border-r border-border p-5 lg:min-h-screen flex flex-col justify-between">
        <div>
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-foreground">UniPay Admin</div>
                <div className="text-[10px] text-muted font-medium">Faculté des Sciences — UAC</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="h-8 w-8 p-0 text-muted hover:text-foreground"
              title={dark ? "Passer au mode clair" : "Passer au mode sombre"}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>

          <nav className="space-y-1.5">
            {links.map(({ to, icon: Icon, label, color }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150",
                    active
                      ? "bg-primary/15 text-primary shadow-sm font-semibold"
                      : "text-muted hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg transition-transform", active ? "scale-110" : "", color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-6 border-t border-border/60 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="w-full justify-start gap-2.5 text-muted hover:text-foreground"
          >
            {dark ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-500" />}
            <span>{dark ? "Mode Clair" : "Mode Sombre"}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2.5 text-rose-600 hover:bg-rose-500/10 hover:text-rose-600 dark:text-rose-400"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            <span>Déconnexion</span>
          </Button>
        </div>
      </aside>

      <main className="p-5 md:p-7">
        <Outlet />
      </main>
    </div>
  );
}

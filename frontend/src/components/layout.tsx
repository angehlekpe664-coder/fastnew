import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShieldCheck, Moon, Sun, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(document.documentElement.classList.contains("dark"));

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
    setDark(document.documentElement.classList.contains("dark"));
    localStorage.setItem("theme", document.documentElement.classList.contains("dark") ? "dark" : "light");
  };

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-3 font-bold text-primary">
            <ShieldCheck className="h-7 w-7" />
            <div className="text-left">
              <div>UniPay Vérification TP</div>
              <div className="text-xs font-normal text-muted">UAC — Faculté des Sciences</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleTheme}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Link to="/admin/login">
              <Button variant="outline" size="sm">Espace Admin</Button>
            </Link>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        © {new Date().getFullYear()} Université d'Abomey-Calavi — Plateforme de vérification des quittances TP
      </footer>
    </div>
  );
}

export function AdminLayout({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
  const location = useLocation();
  const links = [
    { to: "/admin", label: "Vue d'ensemble" },
    { to: "/admin/students", label: "Validés" },
    { to: "/admin/failures", label: "Échecs" },
    { to: "/admin/settings", label: "Paramètres" },
  ];

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-r border-border bg-card p-5">
        <div className="mb-8 flex items-center gap-2 font-bold text-primary">
          <ShieldCheck className="h-6 w-6" /> Administration
        </div>
        <nav className="space-y-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "block rounded-xl px-3 py-2 text-sm font-medium transition",
                location.pathname === l.to ? "bg-secondary text-primary" : "text-muted hover:bg-secondary/60"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Button variant="ghost" className="mt-8 w-full justify-start text-danger" onClick={onLogout}>
          <LogOut className="h-4 w-4" /> Déconnexion
        </Button>
      </aside>
      <main className="p-6">{children}</main>
    </div>
  );
}

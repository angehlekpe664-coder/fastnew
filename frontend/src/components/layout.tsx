import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Moon, Sun, Search } from "lucide-react";
import { Button } from "./ui/button";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      setDark(true);
    }
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
    const isDark = document.documentElement.classList.contains("dark");
    setDark(isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="safe-top sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2.5 sm:py-3">
          <Link to="/" className="flex min-w-0 items-center gap-2 font-bold text-primary">
            <div className="shrink-0 rounded-xl bg-primary/10 p-1.5 sm:p-2">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 text-left leading-tight">
              <div className="truncate text-sm sm:text-[15px]">UniPay Vérification</div>
              <div className="truncate text-[10px] font-normal text-muted sm:text-[11px]">Faculté des Sciences — UAC</div>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-0.5">
            <Link to="/statut">
              <Button variant="ghost" size="sm" className="px-2.5 sm:px-3" aria-label="Consulter un statut">
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Statut</span>
              </Button>
            </Link>
            <Button variant="ghost" size="sm" className="px-2.5" onClick={toggleTheme} aria-label="Changer le thème">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="safe-bottom border-t border-border px-4 py-4 text-center text-[11px] leading-relaxed text-muted sm:py-6 sm:text-xs">
        Paiement sur le portail du Trésor Public
        <br className="sm:hidden" />
        <span className="hidden sm:inline"> · </span>
        Cette plateforme vérifie uniquement votre quittance
      </footer>
    </div>
  );
}

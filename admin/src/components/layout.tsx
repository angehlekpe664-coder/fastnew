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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-primary">
            <div className="rounded-xl bg-primary/10 p-2">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="text-left leading-tight">
              <div className="text-sm">UniPay Vérification</div>
              <div className="text-[11px] font-normal text-muted">Faculté des Sciences — UAC</div>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <Link to="/statut">
              <Button variant="ghost" size="sm"><Search className="h-4 w-4" /> Statut</Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={toggleTheme}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        Paiement sur le portail du Trésor Public · Cette plateforme vérifie uniquement votre quittance
      </footer>
    </div>
  );
}

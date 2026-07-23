import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthGuard, AdminShell } from "@/components/admin-shell";
import LoginPage from "@/pages/LoginPage";
import { Skeleton } from "@/components/ui/admin-ui";

const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const StudentsPage = lazy(() => import("@/pages/StudentsPage"));
const FailuresPage = lazy(() => import("@/pages/FailuresPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const TpCatalogPage = lazy(() => import("@/pages/TpCatalogPage"));

function PageLoader() {
  return (
    <div className="space-y-4 animate-fade-in">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}

function ProtectedLayout() {
  return (
    <AuthGuard>
      <AdminShell />
    </AuthGuard>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route
            path="/"
            element={
              <Suspense fallback={<PageLoader />}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route
            path="/students"
            element={
              <Suspense fallback={<PageLoader />}>
                <StudentsPage />
              </Suspense>
            }
          />
          <Route
            path="/failures"
            element={
              <Suspense fallback={<PageLoader />}>
                <FailuresPage />
              </Suspense>
            }
          />
          <Route
            path="/tp-catalog"
            element={
              <Suspense fallback={<PageLoader />}>
                <TpCatalogPage />
              </Suspense>
            }
          />
          <Route
            path="/settings"
            element={
              <Suspense fallback={<PageLoader />}>
                <SettingsPage />
              </Suspense>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

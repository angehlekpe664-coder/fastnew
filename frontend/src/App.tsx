import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import VerifyPage from "@/pages/VerifyPage";
import ResultPage from "@/pages/ResultPage";
import AdminLoginPage from "@/pages/admin/LoginPage";
import AdminDashboardPage from "@/pages/admin/DashboardPage";
import StudentsPage from "@/pages/admin/StudentsPage";
import FailuresPage from "@/pages/admin/FailuresPage";
import SettingsPage from "@/pages/admin/SettingsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/verifier" element={<VerifyPage />} />
        <Route path="/resultat" element={<ResultPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/students" element={<StudentsPage />} />
        <Route path="/admin/failures" element={<FailuresPage />} />
        <Route path="/admin/settings" element={<SettingsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

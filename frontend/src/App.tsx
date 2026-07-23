import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import VerifyPage from "@/pages/VerifyPage";
import ResultPage from "@/pages/ResultPage";
import StatusPage from "@/pages/StatusPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/verifier" element={<VerifyPage />} />
        <Route path="/resultat" element={<ResultPage />} />
        <Route path="/statut" element={<StatusPage />} />
      </Routes>
    </BrowserRouter>
  );
}

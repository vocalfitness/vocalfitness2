import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ResourcesPage from "./pages/ResourcesPage";
import CorporateTrainingPage from "./pages/CorporateTrainingPage";
import LoginPage from "./pages/LoginPage";
import MembersAreaPage from "./pages/MembersAreaPage";
import AdminPage from "./pages/AdminPage";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <LanguageProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/risorse" element={<ResourcesPage />} />
              <Route path="/corporate-training" element={<CorporateTrainingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/area-clienti" element={<MembersAreaPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </BrowserRouter>
        </LanguageProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
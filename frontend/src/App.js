import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ResourcesPage from "./pages/ResourcesPage";
import CorporateTrainingPage from "./pages/CorporateTrainingPage";
import MedtronicLandingPage from "./pages/MedtronicLandingPage";
import SpeakRight101Page from "./pages/SpeakRight101Page";
import PhonemeCardPage from "./pages/PhonemeCardPage";
import LoginPage from "./pages/LoginPage";
import MembersAreaPage from "./pages/MembersAreaPage";
import AdminPage from "./pages/AdminPage";
import SettingsPage from "./pages/SettingsPage";
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
              <Route path="/speak-right-medtronic" element={<MedtronicLandingPage />} />
              <Route path="/speak-right-101" element={<SpeakRight101Page />} />
              <Route path="/lms/phoneme/:id" element={<PhonemeCardPage />} />
              <Route path="/lms/phoneme" element={<PhonemeCardPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/area-clienti" element={<MembersAreaPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/impostazioni" element={<SettingsPage />} />
            </Routes>
          </BrowserRouter>
        </LanguageProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
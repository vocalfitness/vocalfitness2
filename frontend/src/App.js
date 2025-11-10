import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ResourcesPage from "./pages/ResourcesPage";
import CorporateTrainingPage from "./pages/CorporateTrainingPage";
import { LanguageProvider } from "./context/LanguageContext";

function App() {
  return (
    <div className="App">
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/risorse" element={<ResourcesPage />} />
            <Route path="/corporate-training" element={<CorporateTrainingPage />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </div>
  );
}

export default App;
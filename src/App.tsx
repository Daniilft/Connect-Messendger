import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AuthPage } from "./pages/AuthPage";
import { MessengerPage } from "./pages/MessengerPage";
import { SettingsPage } from "./pages/SettingsPage";
import "./App.css";

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<"messenger" | "settings">(
    "messenger",
  );
  const [settingsClosing, setSettingsClosing] = useState(false);

  const handleOpenSettings = () => {
    setCurrentPage("settings");
    setSettingsClosing(false);
  };

  const handleBack = () => {
    setSettingsClosing(true);
    setTimeout(() => {
      setCurrentPage("messenger");
      setSettingsClosing(false);
    }, 250);
  };

  if (loading) {
    return <div className="loading-screen">Загрузка...</div>;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="app">
      {currentPage === "messenger" ? (
        <MessengerPage onOpenSettings={handleOpenSettings} />
      ) : (
        <div className={`settings-wrapper ${settingsClosing ? "closing" : ""}`}>
          <SettingsPage onBack={handleBack} />
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AuthPage from './pages/AuthPage';
import InstitutionDashboard from './pages/InstitutionDashboard';
import HomePage from './pages/HomePage';
import OcrInspectorPage from './pages/OcrInspectorPage';
import DossierPage from './pages/DossierPage';
import { api } from './config/api';

export default function App() {
  const [authUser, setAuthUser]           = useState(() => {
    try {
      const stored = localStorage.getItem('docuauth_user');
      return stored ? JSON.parse(stored) : null;
    } catch (_) {
      return null;
    }
  });

  const [activeTab, setActiveTab]         = useState('home');
  const [currentApp, setCurrentApp]       = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isSeeding, setIsSeeding]         = useState(false);

  // Load most recent application on mount when logged in as authority
  useEffect(() => {
    if (authUser?.role === 'authority') {
      loadInitialApp();
    }
  }, [authUser?.role]);

  const loadInitialApp = async () => {
    try {
      const data = await api.getApplications();
      if (data.applications?.length > 0) {
        setCurrentApp(data.applications[0]);
      }
    } catch (_) {}
  };

  const handleLoginSuccess = (user) => {
    setAuthUser(user);
    try {
      localStorage.setItem('docuauth_user', JSON.stringify(user));
    } catch (_) {}
  };

  const handleLogout = () => {
    setAuthUser(null);
    setCurrentApp(null);
    setSelectedDocument(null);
    try {
      localStorage.removeItem('docuauth_user');
    } catch (_) {}
  };

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      const res = await api.seedDemo();
      if (res.success && res.data) {
        setCurrentApp(res.data.application);
        if (res.data.documents?.length > 0) {
          setSelectedDocument(res.data.documents[0].document);
        }
        setActiveTab('inspector');
      }
    } catch (err) {
      alert('Failed to seed demo: ' + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  // ── Authentication Check ──────────────────────────────────────────────────
  if (!authUser) {
    return <AuthPage onLoginSuccess={handleLoginSuccess} />;
  }

  // ── Role: Institution Holder ───────────────────────────────────────────────
  if (authUser.role === 'institution') {
    return (
      <InstitutionDashboard 
        authUser={authUser} 
        onLogout={handleLogout} 
      />
    );
  }

  // ── Role: AICTE Authority (Review, OCR Inspection, Decision & Report) ──────
  return (
    <div className="app-container">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentApp={currentApp}
        onSeedDemo={handleSeedDemo}
        isSeeding={isSeeding}
        authUser={authUser}
        onLogout={handleLogout}
      />

      <main className="main-content">
        {activeTab === 'home' && (
          <HomePage
            setActiveTab={setActiveTab}
            onSelectApp={(app) => setCurrentApp(app)}
            onSeedDemo={handleSeedDemo}
            isSeeding={isSeeding}
          />
        )}

        {activeTab === 'inspector' && (
          <OcrInspectorPage
            currentApp={currentApp}
            selectedDocument={selectedDocument}
            onSelectDocument={(doc) => setSelectedDocument(doc)}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'dossier' && (
          <DossierPage
            currentApp={currentApp}
            setActiveTab={setActiveTab}
            onSelectDocument={(doc) => setSelectedDocument(doc)}
            canDecide={true}
            onStatusChange={(updatedApp) => setCurrentApp(updatedApp)}
          />
        )}
      </main>

      <footer style={{
        background: 'white',
        borderTop: '1px solid var(--slate-200)',
        padding: '20px 24px',
        textAlign: 'center',
        fontSize: '0.82rem',
        color: 'var(--slate-500)'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            AegisDocs • AI-Powered Regulatory Compliance Verification System
          </div>
          <div>
            AICTE Regulatory Compliance Verification System
          </div>
        </div>
      </footer>
    </div>
  );
}

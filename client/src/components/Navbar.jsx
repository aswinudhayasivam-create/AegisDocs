import React from 'react';
import { 
  Home, 
  ScanText, 
  FileCheck2,
  Sparkles,
  LogOut,
  User,
  BadgeCheck
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  currentApp, 
  onSeedDemo, 
  isSeeding, 
  authUser,
  onLogout 
}) {
  // Authority navigation - strictly verification & compliance review
  const navItems = [
    { id: 'home',      label: 'Overview',          icon: Home },
    { id: 'inspector', label: 'OCR & Extraction',   icon: ScanText },
    { id: 'dossier',   label: 'Application Dossier',icon: FileCheck2 },
  ];

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="brand" onClick={() => setActiveTab('home')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src="/logo-shield.png"
            alt="AegisDocs Logo"
            style={{ width: 38, height: 38, objectFit: 'contain', flexShrink: 0 }}
          />
          <div>
            <div className="brand-title">AegisDocs</div>
            <div className="brand-subtitle" style={{ whiteSpace: 'nowrap' }}>AICTE Authority Portal</div>
          </div>
        </div>

        <nav className="nav-links">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {currentApp && (
            <div className="badge badge-blue" style={{ padding: '6px 12px' }}>
              <span>Active: {currentApp.applicationId}</span>
            </div>
          )}

          {/* User & Role badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#ede9fe',
            border: '1px solid #c4b5fd',
            color: '#6d28d9',
            borderRadius: 8,
            padding: '5px 12px',
            fontSize: '0.78rem',
            fontWeight: 700,
            whiteSpace: 'nowrap'
          }}>
            <User size={13} />
            <span>{authUser?.username || 'Officer'} • AICTE Authority</span>
          </div>

          <button 
            className="btn btn-primary btn-sm"
            onClick={onSeedDemo}
            disabled={isSeeding}
            title="Seeds Example Engineering College Scenario"
          >
            <Sparkles size={14} />
            <span>{isSeeding ? 'Seeding...' : 'One-Click Demo'}</span>
          </button>

          {/* Logout button */}
          <button
            onClick={onLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, padding: '7px 14px', cursor: 'pointer',
              fontSize: '0.82rem', color: '#dc2626', fontWeight: 700,
              boxShadow: '0 1px 2px rgba(220,38,38,0.1)',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fee2e2';
              e.currentTarget.style.borderColor = '#f87171';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fef2f2';
              e.currentTarget.style.borderColor = '#fecaca';
            }}
            title="Log out of AICTE Authority portal"
          >
            <LogOut size={15} color="#dc2626" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}

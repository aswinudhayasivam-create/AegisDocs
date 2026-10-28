import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, ClipboardList, UploadCloud, RefreshCw, LogOut,
  CheckCircle2, XCircle, Clock, AlertCircle, ShieldCheck, ArrowRight,
  FileText, Calendar, User, ChevronDown, ChevronUp, Layers
} from 'lucide-react';
import { api } from '../config/api';
import ApplicationPage from './ApplicationPage';
import UploadPage from './UploadPage';

const STATUS_CONFIG = {
  SUBMITTED:    { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: 'Submitted',    icon: Clock,         text: 'Your application has been received and is awaiting review by the AICTE authority.' },
  UNDER_REVIEW: { color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Under Review', icon: AlertCircle,   text: 'An AICTE officer is currently reviewing your submitted documents and compliance records.' },
  ACCEPTED:     { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'Accepted',     icon: CheckCircle2,  text: 'Congratulations! Your application has been reviewed and approved by the AICTE authority.' },
  REJECTED:     { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Rejected',     icon: XCircle,       text: 'Your application has been reviewed and rejected. Please contact AICTE for further clarification.' },
};

export default function InstitutionDashboard({ authUser, onLogout }) {
  const [activeTab, setActiveTab]         = useState('status'); // default to status so they see all apps
  const [applications, setApplications]   = useState([]);
  const [selectedApp, setSelectedApp]     = useState(null);
  const [polling, setPolling]             = useState(false);
  const [lastRefresh, setLastRefresh]     = useState(null);
  const [expandedAppId, setExpandedAppId] = useState(null);

  // Filter applications belonging to this institution
  const filterMyApplications = useCallback((allApps) => {
    if (!allApps || allApps.length === 0) return [];

    const instName  = (authUser?.institutionName || '').toLowerCase().trim();
    const userEmail = (authUser?.email || '').toLowerCase().trim();
    const userName  = (authUser?.username || '').toLowerCase().trim();

    return allApps.filter(app => {
      // 1. Matched by submittedBy (username or ID)
      if (app.submittedBy) {
        const sub = String(app.submittedBy).toLowerCase().trim();
        if (userName && sub === userName) return true;
        if (authUser?.id && app.submittedBy === authUser.id) return true;
      }

      // 2. Matched by institutionName (exact or substring match)
      if (instName && app.institutionName) {
        const appInst = app.institutionName.toLowerCase().trim();
        if (appInst === instName) return true;
        if (instName.includes(appInst) || appInst.includes(instName)) return true;
      }

      // 3. Matched by representative email
      if (userEmail && app.representative?.email) {
        const appEmail = app.representative.email.toLowerCase().trim();
        if (appEmail === userEmail) return true;
      }

      // 4. Special match for 'institution' default user or Example Engineering College
      if (userName === 'institution' || instName.includes('example')) {
        const appInst = (app.institutionName || '').toLowerCase();
        if (appInst.includes('example')) return true;
      }

      return false;
    });
  }, [authUser]);

  // Load all applications from server
  const loadApplications = useCallback(async () => {
    setPolling(true);
    try {
      const data = await api.getApplications();
      const all = data.applications || [];
      const myApps = filterMyApplications(all);
      setApplications(myApps);

      // Keep selected app updated or select first
      if (myApps.length > 0) {
        setSelectedApp(prev => {
          if (!prev) return myApps[0];
          const updated = myApps.find(a => a.id === prev.id || a.applicationId === prev.applicationId);
          return updated || myApps[0];
        });
      }
      setLastRefresh(new Date());
    } catch (e) {
      console.warn('Failed to fetch applications:', e);
    } finally {
      setPolling(false);
    }
  }, [filterMyApplications]);

  // Initial load and periodic refresh every 10s when on status tab
  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    if (activeTab !== 'status') return;
    const timer = setInterval(() => {
      loadApplications();
    }, 10000);
    return () => clearInterval(timer);
  }, [activeTab, loadApplications]);

  const handleApplicationCreated = (newApp) => {
    setSelectedApp(newApp);
    setActiveTab('upload');
    loadApplications();
  };

  // Status metrics counts
  const totalCount    = applications.length;
  const acceptedCount = applications.filter(a => a.status === 'ACCEPTED').length;
  const rejectedCount = applications.filter(a => a.status === 'REJECTED').length;
  const reviewCount   = applications.filter(a => a.status === 'UNDER_REVIEW' || a.status === 'SUBMITTED').length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--slate-50, #f8fafc)', fontFamily: 'var(--font-sans)' }}>

      {/* Top Header Bar */}
      <header style={{
        background: 'white', borderBottom: '1px solid #e2e8f0',
        padding: '0 24px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src="/logo-shield.png"
            alt="AegisDocs Logo"
            style={{ width: 38, height: 38, objectFit: 'contain', flexShrink: 0 }}
          />
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', letterSpacing: '-0.02em' }}>AegisDocs</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Institution Portal</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            color: '#16a34a', borderRadius: 8, padding: '4px 12px',
            fontSize: '0.78rem', fontWeight: 700,
          }}>
            {authUser?.institutionName || authUser?.username || 'Institution Holder'}
          </span>
          <button
            onClick={onLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
              fontSize: '0.82rem', color: '#dc2626', fontWeight: 700,
              transition: 'all 0.15s'
            }}
          >
            <LogOut size={14} color="#dc2626" />
            <span>Log Out</span>
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 24px' }}>
        <div style={{ display: 'flex', gap: 4, maxWidth: 960, margin: '0 auto' }}>
          {[
            { id: 'status', label: `Application Status (${applications.length})`, icon: Building2 },
            { id: 'upload', label: 'Upload Documents',    icon: UploadCloud },
            { id: 'submit', label: 'Submit New Application', icon: ClipboardList },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '14px 20px', cursor: 'pointer',
              background: 'transparent', border: 'none',
              borderBottom: activeTab === id ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === id ? '#2563eb' : '#64748b',
              fontWeight: activeTab === id ? 700 : 500,
              fontSize: '0.88rem', marginBottom: -1,
              transition: 'color 0.15s',
            }}>
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Container */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>

        {/* ══════════════════════════════════════════════════════════════════════
            1. APPLICATION STATUS TAB — Lists ALL Applications Submitted
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'status' && (
          <div>
            {/* Header & Metrics */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                  Submitted Applications & Status Overview
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>
                  Track regulatory approvals, review status, and decisions across all your institution's submissions.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={loadApplications}
                  disabled={polling}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'white', border: '1px solid #cbd5e1',
                    borderRadius: 8, padding: '7px 14px', cursor: polling ? 'wait' : 'pointer',
                    fontSize: '0.82rem', fontWeight: 600, color: '#334155',
                  }}
                >
                  <RefreshCw size={13} style={{ animation: polling ? 'spin 1s linear infinite' : 'none' }} />
                  <span>{polling ? 'Refreshing...' : 'Refresh Status'}</span>
                </button>
                {lastRefresh && (
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Updated {lastRefresh.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>

            {/* Metric Summary Cards */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 14, marginBottom: 24
            }}>
              <div style={{ background: 'white', borderRadius: 12, padding: '16px 18px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Total Applications
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: 4 }}>
                  {totalCount}
                </div>
              </div>

              <div style={{ background: 'white', borderRadius: 12, padding: '16px 18px', border: '1px solid #e2e8f0', borderLeft: '4px solid #2563eb' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>
                  Pending / In Review
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563eb', marginTop: 4 }}>
                  {reviewCount}
                </div>
              </div>

              <div style={{ background: 'white', borderRadius: 12, padding: '16px 18px', border: '1px solid #e2e8f0', borderLeft: '4px solid #16a34a' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>
                  Accepted & Approved
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16a34a', marginTop: 4 }}>
                  {acceptedCount}
                </div>
              </div>

              <div style={{ background: 'white', borderRadius: 12, padding: '16px 18px', border: '1px solid #e2e8f0', borderLeft: '4px solid #dc2626' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>
                  Rejected
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#dc2626', marginTop: 4 }}>
                  {rejectedCount}
                </div>
              </div>
            </div>

            {/* List of Applications */}
            {applications.length === 0 ? (
              <div style={{
                background: 'white', borderRadius: 16, padding: '60px 32px',
                textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                <Building2 size={48} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.1rem', marginBottom: 10 }}>
                  No Applications Found
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: 420, margin: '0 auto 24px' }}>
                  You haven't submitted any regulatory applications yet. Get started by registering your institution.
                </p>
                <button
                  onClick={() => setActiveTab('submit')}
                  style={{
                    background: '#2563eb', color: 'white', border: 'none',
                    borderRadius: 10, padding: '10px 24px', cursor: 'pointer',
                    fontWeight: 700, fontSize: '0.88rem',
                  }}
                >
                  Submit New Application
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {applications.map((app, index) => {
                  const st = app.status || 'SUBMITTED';
                  const cfg = STATUS_CONFIG[st] || STATUS_CONFIG.SUBMITTED;
                  const Icon = cfg.icon;
                  const isExpanded = expandedAppId === app.id;

                  return (
                    <div
                      key={app.id || app.applicationId}
                      style={{
                        background: 'white',
                        borderRadius: 14,
                        border: `1.5px solid ${cfg.border}`,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        overflow: 'hidden',
                        transition: 'box-shadow 0.15s'
                      }}
                    >
                      {/* Main Card Header */}
                      <div style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                          
                          {/* Left: Info */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                            <div style={{
                              width: 46, height: 46, borderRadius: 12,
                              background: cfg.bg, border: `1px solid ${cfg.border}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                              <Icon size={24} color={cfg.color} />
                            </div>

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                                  {app.applicationId}
                                </span>
                                <span style={{
                                  background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                                  borderRadius: 6, padding: '2px 10px', fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.04em'
                                }}>
                                  {st}
                                </span>
                                <span style={{ fontSize: '0.78rem', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 }}>
                                  {app.category}
                                </span>
                              </div>

                              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', margin: '0 0 6px' }}>
                                {app.institutionName}
                              </h3>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: '0.8rem', color: '#64748b', flexWrap: 'wrap' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Calendar size={13} />
                                  Submitted: {new Date(app.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                                </span>
                                {app.representative?.name && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <User size={13} />
                                    Rep: {app.representative.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button
                              onClick={() => {
                                setSelectedApp(app);
                                setActiveTab('upload');
                              }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                background: '#eff6ff', border: '1px solid #bfdbfe',
                                color: '#1d4ed8', borderRadius: 8, padding: '7px 14px',
                                fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer'
                              }}
                              title="Upload or manage documents for this application"
                            >
                              <UploadCloud size={14} />
                              <span>Upload Documents</span>
                            </button>

                            <button
                              onClick={() => setExpandedAppId(isExpanded ? null : app.id)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                background: 'transparent', border: '1px solid #e2e8f0',
                                color: '#64748b', borderRadius: 8, padding: '7px 12px',
                                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer'
                              }}
                            >
                              <span>{isExpanded ? 'Less' : 'Details'}</span>
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </div>
                        </div>

                        {/* Status Message Banner */}
                        <div style={{
                          marginTop: 14, background: cfg.bg, border: `1px solid ${cfg.border}`,
                          borderRadius: 8, padding: '10px 14px', fontSize: '0.84rem', color: '#334155',
                          display: 'flex', alignItems: 'center', gap: 8
                        }}>
                          <Icon size={16} color={cfg.color} style={{ flexShrink: 0 }} />
                          <span style={{ lineHeight: 1.5 }}>{cfg.text}</span>
                        </div>
                      </div>

                      {/* Expandable Submission Details Panel */}
                      {isExpanded && (
                        <div style={{
                          borderTop: '1px solid #e2e8f0',
                          background: '#f8fafc',
                          padding: '18px 24px'
                        }}>
                          <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '12px 24px', fontSize: '0.85rem'
                          }}>
                            <div>
                              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                                Full Application ID
                              </div>
                              <div style={{ fontWeight: 600, color: '#0f172a', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                                {app.id} / {app.applicationId}
                              </div>
                            </div>

                            <div>
                              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                                Representative Email
                              </div>
                              <div style={{ fontWeight: 600, color: '#0f172a', marginTop: 2 }}>
                                {app.representative?.email || 'N/A'}
                              </div>
                            </div>

                            <div>
                              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                                Representative Phone
                              </div>
                              <div style={{ fontWeight: 600, color: '#0f172a', marginTop: 2 }}>
                                {app.representative?.phone || 'N/A'}
                              </div>
                            </div>

                            <div>
                              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                                Review Timestamp
                              </div>
                              <div style={{ fontWeight: 600, color: '#0f172a', marginTop: 2 }}>
                                {app.reviewedAt 
                                  ? new Date(app.reviewedAt).toLocaleString('en-IN') 
                                  : 'Pending review by AICTE'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            2. UPLOAD DOCUMENTS TAB — Upload Certificates for an Application
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'upload' && (
          <div>
            {applications.length === 0 ? (
              <div style={{
                background: 'white', borderRadius: 16, padding: '60px 32px',
                textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                <UploadCloud size={48} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontWeight: 700, color: '#0f172a', fontSize: '1.1rem', marginBottom: 10 }}>
                  Please Submit an Application Form First
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: 420, margin: '0 auto 24px' }}>
                  Register your institution details before uploading regulatory certificates.
                </p>
                <button
                  onClick={() => setActiveTab('submit')}
                  style={{
                    background: '#2563eb', color: 'white', border: 'none',
                    borderRadius: 10, padding: '10px 24px', cursor: 'pointer',
                    fontWeight: 700, fontSize: '0.88rem',
                  }}
                >
                  Go to Application Form
                </button>
              </div>
            ) : (
              <div>
                {/* Application Switcher Banner */}
                <div style={{
                  background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12,
                  padding: '16px 20px', marginBottom: 20, display: 'flex',
                  alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e40af' }}>
                      Uploading Documents For:
                    </span>
                    <select
                      className="form-select"
                      value={selectedApp?.id || ''}
                      onChange={(e) => {
                        const found = applications.find(a => a.id === e.target.value);
                        if (found) setSelectedApp(found);
                      }}
                      style={{
                        padding: '6px 12px', borderRadius: 8, border: '1.5px solid #93c5fd',
                        fontWeight: 700, fontSize: '0.88rem', background: 'white', color: '#1e3a8a'
                      }}
                    >
                      {applications.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.applicationId} — {a.institutionName} ({a.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => setActiveTab('status')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: '#2563eb', color: 'white', border: 'none',
                      borderRadius: 8, padding: '8px 16px', fontSize: '0.82rem',
                      fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    <span>View All Statuses</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                {selectedApp && (
                  <UploadPage
                    currentApp={selectedApp}
                    setCurrentApp={setSelectedApp}
                    setActiveTab={() => {}}
                    onSelectDocument={() => {}}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            3. SUBMIT APPLICATION TAB — Register another Application
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'submit' && (
          <ApplicationPage
            onApplicationCreated={handleApplicationCreated}
            setActiveTab={() => {}}
            defaultInstitutionName={authUser?.institutionName || ''}
            defaultEmail={authUser?.email || ''}
            submittedBy={authUser?.username || authUser?.id || ''}
          />
        )}

      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #e2e8f0', padding: '16px 24px', textAlign: 'center',
        fontSize: '0.78rem', color: '#94a3b8', background: 'white',
      }}>
        AegisDocs • AI-Powered Regulatory Compliance Verification System
      </footer>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Sparkles, 
  Layers, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  Upload,
  Cpu,
  Building
} from 'lucide-react';
import WorkflowDiagram from '../components/WorkflowDiagram';
import { api } from '../config/api';

export default function HomePage({ setActiveTab, onSelectApp, onSeedDemo, isSeeding }) {
  const [apps, setApps] = useState([]);
  const [stats, setStats] = useState({ totalApps: 0, totalDocs: 0, totalFields: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await api.getApplications();
      setApps(data.applications || []);

      let docCount = 0;
      let fieldCount = 0;
      // Fetch details for first few to get counts
      for (const a of (data.applications || []).slice(0, 5)) {
        try {
          const detail = await api.getApplication(a.id);
          docCount += detail.documentsCount || 0;
          fieldCount += (detail.fields || []).length;
        } catch (e) {}
      }

      setStats({
        totalApps: data.count || 0,
        totalDocs: docCount,
        totalFields: fieldCount
      });
    } catch (err) {
      console.warn('Failed to load apps:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: 'var(--radius-lg)',
        padding: '36px 32px',
        color: 'white',
        marginBottom: '28px',
        boxShadow: 'var(--shadow-md)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '780px', position: 'relative', zIndex: 2 }}>
          <div className="badge" style={{ background: 'rgba(59, 130, 246, 0.25)', color: '#93c5fd', marginBottom: '14px', border: '1px solid rgba(147, 197, 253, 0.3)' }}>
            <Sparkles size={13} />
            <span>MERN Stack Prototype • Intelligent Verification System</span>
          </div>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, lineHeight: 1.25, marginBottom: '12px', letterSpacing: '-0.02em' }}>
            AI-Powered Application Validation & Document Authentication
          </h1>
          <p style={{ fontSize: '1rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '24px' }}>
            Automate regulatory screening for educational institutions. Extracts structured metadata from digital PDFs and scanned certificates, performs SHA-256 duplicate detection, flags inconsistencies, and prepares evidence-backed verification reports.
          </p>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-primary"
              onClick={onSeedDemo}
              disabled={isSeeding}
              style={{ padding: '12px 24px', fontSize: '0.95rem' }}
            >
              <Sparkles size={18} />
              <span>{isSeeding ? 'Seeding Demo Scenario...' : 'Run One-Click Demo'}</span>
            </button>
            <button 
              className="btn btn-secondary"
              onClick={() => setActiveTab('dossier')}
              style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}
            >
              <FileText size={18} />
              <span>Review Applications Dossier</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5-Stage Architecture Visualizer */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-900)' }}>
            System Workflow & Processing Pipeline
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
            Automated Ingestion, OCR, Compliance & Validation
          </span>
        </div>
        <WorkflowDiagram activeStep={3} onStepClick={(step) => {
          if (step <= 3) setActiveTab('inspector');
          if (step >= 4) setActiveTab('dossier');
        }} />
      </div>

      {/* Metrics Row */}
      <div className="grid-3" style={{ marginBottom: '28px' }}>
        <div className="card" style={{ marginBottom: 0, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase' }}>
                Applications Registered
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-900)', marginTop: '4px' }}>
                {stats.totalApps}
              </div>
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: '8px' }}>
            Active Institutional Records
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase' }}>
                Processed Documents
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-900)', marginTop: '4px' }}>
                {stats.totalDocs}
              </div>
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--success-light)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Upload size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: '8px' }}>
            SHA-256 Hashed & Processed Files
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase' }}>
                Extracted Key Fields
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-900)', marginTop: '4px' }}>
                {stats.totalFields}
              </div>
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Cpu size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: '8px' }}>
            Automated Key-Field Extractions
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Building size={20} color="var(--primary)" />
            <span>Submitted Applications</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={loadData}>
            Refresh
          </button>
        </div>

        {apps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--slate-500)' }}>
            <FileText size={36} color="var(--slate-300)" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>No applications registered yet</div>
            <p style={{ fontSize: '0.85rem', marginTop: '4px', marginBottom: '16px' }}>
              Click "One-Click Demo" to immediately load the Example Engineering College reference scenario or register a new one.
            </p>
            <button className="btn btn-primary btn-sm" onClick={onSeedDemo} disabled={isSeeding}>
              <Sparkles size={14} />
              <span>Load Reference Demo Scenario</span>
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--slate-200)', color: 'var(--slate-600)' }}>
                  <th style={{ padding: '10px 14px' }}>Application ID</th>
                  <th style={{ padding: '10px 14px' }}>Institution Name</th>
                  <th style={{ padding: '10px 14px' }}>Category</th>
                  <th style={{ padding: '10px 14px' }}>Representative</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {apps.map(app => (
                  <tr key={app.id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      {app.applicationId}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--slate-900)' }}>
                      {app.institutionName}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--slate-600)' }}>
                      {app.category}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--slate-600)' }}>
                      {app.representative?.name || 'N/A'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className="badge badge-blue">{app.status}</span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          onSelectApp(app);
                          setActiveTab('inspector');
                        }}
                      >
                        <span>Inspect OCR</span>
                        <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

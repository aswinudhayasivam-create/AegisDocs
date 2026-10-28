import React, { useState, useEffect } from 'react';
import { 
  FileCheck2, 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  ShieldAlert, 
  ExternalLink,
  Layers,
  Code,
  Building,
  RefreshCw,
  Cpu,
  CheckCircle2,
  XCircle,
  FileDown,
  Loader2
} from 'lucide-react';
import { api } from '../config/api';

export default function DossierPage({ currentApp, setActiveTab, onSelectDocument, canDecide = false, onStatusChange }) {
  const [details, setDetails] = useState(null);
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [decisionMsg, setDecisionMsg] = useState('');

  useEffect(() => {
    if (currentApp) {
      loadDossier();
    }
  }, [currentApp?.id]);

  const loadDossier = async () => {
    setLoading(true);
    try {
      const data = await api.getApplication(currentApp.id);
      setDetails(data);

      try {
        const valData = await api.getValidation(currentApp.id);
        setValidation(valData.validation);
      } catch (e) {
        console.warn('Validation service warning:', e);
      }
    } catch (err) {
      console.warn('Failed to load dossier:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (status) => {
    setDeciding(true);
    setDecisionMsg('');
    try {
      const res = await api.updateApplicationStatus(currentApp.id, status);
      setDecisionMsg(`Application ${status === 'ACCEPTED' ? 'accepted' : 'rejected'} successfully.`);
      // Refresh dossier to reflect new status
      await loadDossier();
      if (onStatusChange) onStatusChange(res.application);
    } catch (err) {
      setDecisionMsg(`Error: ${err.message}`);
    } finally {
      setDeciding(false);
    }
  };

  const handleDownloadReport = async () => {
    setDownloading(true);
    try {
      await api.downloadReport(currentApp.id);
    } catch (err) {
      alert('Could not generate report: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleExportJson = () => {
    if (!details) return;
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      source: 'MERN Prototype - Verification Handoff',
      application: details.application,
      categoryRules: details.categoryDetails,
      checklistAudit: details.checklist,
      documentsCount: details.documentsCount,
      documents: details.documents,
      extractedFields: details.fields,
      preliminaryValidation: validation
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `dossier_${details.application.applicationId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  if (!currentApp || !details) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <FileCheck2 size={48} color="var(--slate-300)" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--slate-800)' }}>
          No Active Application
        </h3>
        <p style={{ color: 'var(--slate-500)', fontSize: '0.9rem', maxWidth: '460px', margin: '8px auto 20px' }}>
          Please select an application from the Overview page or use One-Click Demo.
        </p>
        <button className="btn btn-primary" onClick={() => setActiveTab('home')}>
          Go to Overview
        </button>
      </div>
    );
  }

  const { application, checklist, documents, fields } = details;

  // Current status helpers
  const appStatus   = application.status || 'SUBMITTED';
  const isAccepted  = appStatus === 'ACCEPTED';
  const isRejected  = appStatus === 'REJECTED';
  const statusColor = isAccepted ? 'var(--success, #16a34a)'
                    : isRejected ? 'var(--danger)'
                    : appStatus === 'UNDER_REVIEW' ? '#d97706'
                    : 'var(--primary)';
  const statusBg    = isAccepted ? '#f0fdf4'
                    : isRejected ? '#fef2f2'
                    : appStatus === 'UNDER_REVIEW' ? '#fffbeb'
                    : '#eff6ff';

  return (
    <div>
      {/* Dossier Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div className="badge badge-blue" style={{ marginBottom: '6px' }}>
            Consolidated Verification Record
          </div>
          <h2 style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Application Dossier: {application.institutionName}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
            <p style={{ color: 'var(--slate-600)', fontSize: '0.9rem', margin: 0 }}>
              ID: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{application.applicationId}</span> • 
              Category: {application.category}
            </p>
            <span style={{
              background: statusBg, color: statusColor,
              border: `1px solid ${statusColor}44`,
              borderRadius: 8, padding: '2px 12px',
              fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.05em',
            }}>
              {appStatus}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <button className="btn btn-secondary" onClick={loadDossier}>
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
          {/* PDF Report — authority only */}
          {canDecide && (
            <button
              className="btn btn-primary"
              onClick={handleDownloadReport}
              disabled={downloading}
              style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
            >
              {downloading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <FileDown size={16} />}
              <span>{downloading ? 'Generating…' : 'Download PDF Report'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Authority Decision Panel */}
      {canDecide && (
        <div className="card" style={{ background: '#f8fafc', borderLeft: '4px solid var(--primary)', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--slate-900)', marginBottom: 4 }}>
                Authority Decision
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--slate-600)' }}>
                Review the checklist and validation findings, then issue your decision.
              </div>
              {decisionMsg && (
                <div style={{ marginTop: 8, fontSize: '0.84rem', fontWeight: 600,
                  color: decisionMsg.startsWith('Error') ? 'var(--danger)' : '#16a34a' }}>
                  {decisionMsg}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => handleDecision('ACCEPTED')}
                disabled={deciding || isAccepted}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: isAccepted ? '#dcfce7' : '#16a34a', color: isAccepted ? '#15803d' : 'white',
                  border: `1.5px solid ${isAccepted ? '#86efac' : '#15803d'}`,
                  borderRadius: 10, padding: '10px 20px', cursor: deciding || isAccepted ? 'default' : 'pointer',
                  fontWeight: 700, fontSize: '0.88rem', opacity: deciding ? 0.7 : 1,
                }}
              >
                <CheckCircle2 size={18} />
                {isAccepted ? 'Accepted' : 'Accept'}
              </button>
              <button
                onClick={() => handleDecision('REJECTED')}
                disabled={deciding || isRejected}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: isRejected ? '#fee2e2' : '#dc2626', color: isRejected ? '#b91c1c' : 'white',
                  border: `1.5px solid ${isRejected ? '#fca5a5' : '#b91c1c'}`,
                  borderRadius: 10, padding: '10px 20px', cursor: deciding || isRejected ? 'default' : 'pointer',
                  fontWeight: 700, fontSize: '0.88rem', opacity: deciding ? 0.7 : 1,
                }}
              >
                <XCircle size={18} />
                {isRejected ? 'Rejected' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Findings Card */}
      {validation && validation.totalFindings > 0 && (
        <div className="card" style={{ borderLeft: '4px solid var(--warning)', background: '#fffdfa' }}>
          <div className="card-header" style={{ marginBottom: '12px' }}>
            <div className="card-title" style={{ fontSize: '1rem', color: '#b45309' }}>
              <AlertTriangle size={18} />
              <span>Preliminary Validation Findings</span>
            </div>
            <span className="badge badge-amber">{validation.totalFindings} Findings Flagged</span>
          </div>

          <p style={{ fontSize: '0.84rem', color: 'var(--slate-600)', marginBottom: '14px' }}>
            These automated preliminary findings were generated by the validation engine:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {validation.findings.map((f, idx) => (
              <div 
                key={idx}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: f.severity === 'ERROR' ? 'var(--danger-light)' : 'var(--warning-light)',
                  border: `1px solid ${f.severity === 'ERROR' ? '#fecaca' : '#fde68a'}`,
                  fontSize: '0.84rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ fontWeight: 700, color: f.severity === 'ERROR' ? 'var(--danger)' : '#92400e' }}>
                    [{f.severity}] {f.title}
                  </span>
                  <span className="badge badge-gray" style={{ fontSize: '0.66rem' }}>{f.checkType}</span>
                </div>
                <div style={{ color: 'var(--slate-700)' }}>
                  {f.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regulatory Checklist Audit Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <CheckCircle size={18} color="var(--primary)" />
            <span>Document Checklist Completeness</span>
          </div>
          <span className="badge badge-blue">
            {checklist.filter(c => c.isUploaded).length} of {checklist.length} Uploaded
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--slate-200)', color: 'var(--slate-600)' }}>
                <th style={{ padding: '10px 12px' }}>Required Document</th>
                <th style={{ padding: '10px 12px' }}>Description / Rule</th>
                <th style={{ padding: '10px 12px' }}>Type</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
                <th style={{ padding: '10px 12px' }}>Attached File</th>
              </tr>
            </thead>
            <tbody>
              {checklist.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                  <td style={{ padding: '12px', fontWeight: 700, color: 'var(--slate-900)' }}>
                    {item.label}
                  </td>
                  <td style={{ padding: '12px', color: 'var(--slate-600)', maxWidth: '320px' }}>
                    {item.description}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span className="badge badge-gray">{item.mandatory ? 'Mandatory' : 'Optional'}</span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {item.isUploaded ? (
                      <span className="badge badge-green">Uploaded & Parsed</span>
                    ) : (
                      <span className="badge badge-red">Missing</span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {item.documentName ? (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--primary)' }}>
                        {item.documentName}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--slate-400)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Aggregated Extracted Fields Across Documents */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Cpu size={18} color="var(--primary)" />
            <span>Extracted Key Fields Matrix</span>
          </div>
          <span className="badge badge-green">{fields.length} Fields Extracted</span>
        </div>

        {fields.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--slate-500)' }}>
            No extracted fields available.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--slate-200)', color: 'var(--slate-600)' }}>
                  <th style={{ padding: '10px 12px' }}>Field Name</th>
                  <th style={{ padding: '10px 12px' }}>Extracted Value</th>
                  <th style={{ padding: '10px 12px' }}>Confidence</th>
                  <th style={{ padding: '10px 12px' }}>Source Snippet Context</th>
                  <th style={{ padding: '10px 12px' }}>Verification Status</th>
                </tr>
              </thead>
              <tbody>
                {fields.map(f => (
                  <tr key={f.id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: 'var(--slate-800)' }}>
                      {f.label || f.fieldName}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--slate-900)' }}>
                      {f.extractedValue}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span className="badge badge-blue">
                        {(f.confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--slate-600)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', maxWidth: '300px' }}>
                      "{f.sourceSnippet || 'N/A'}"
                    </td>
                    <td style={{ padding: '12px' }}>
                      {f.isVerified ? (
                        <span className="badge badge-green">Verified</span>
                      ) : (
                        <span className="badge badge-gray">Automated</span>
                      )}
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

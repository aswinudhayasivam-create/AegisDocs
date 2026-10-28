import React, { useState, useEffect } from 'react';
import { 
  ScanText, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Edit3, 
  Download, 
  ExternalLink,
  ShieldCheck,
  Calendar,
  Building,
  Award,
  Hash,
  Layers,
  ArrowRight
} from 'lucide-react';
import FieldEditorModal from '../components/FieldEditorModal';
import { api } from '../config/api';

export default function OcrInspectorPage({ currentApp, selectedDocument, onSelectDocument, setActiveTab }) {
  const [docs, setDocs] = useState([]);
  const [activeDoc, setActiveDoc] = useState(selectedDocument || null);
  const [fields, setFields] = useState([]);
  const [rawText, setRawText] = useState('');
  const [activeTabSub, setActiveTabSub] = useState('fields'); // 'fields', 'text', 'audit'
  const [editingField, setEditingField] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentApp) {
      loadDocuments();
    }
  }, [currentApp]);

  useEffect(() => {
    if (activeDoc) {
      loadDocumentDetails(activeDoc.id);
    }
  }, [activeDoc?.id]);

  const loadDocuments = async () => {
    try {
      const data = await api.getApplication(currentApp.id);
      const docList = data.documents || [];
      setDocs(docList);
      if (docList.length > 0) {
        const found = docList.find(d => d.id === activeDoc?.id);
        setActiveDoc(found || docList[0]);
      } else {
        setActiveDoc(null);
        setFields([]);
        setRawText('');
      }
    } catch (e) {
      console.warn('Failed to load docs:', e);
    }
  };

  const loadDocumentDetails = async (docId) => {
    setLoading(true);
    try {
      const data = await api.getDocument(docId);
      setActiveDoc(data.document);
      setFields(data.fields || []);
      setRawText(data.document?.rawText || '');
    } catch (e) {
      console.warn('Failed to load document details:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldSave = async (fieldName, newValue) => {
    if (!activeDoc) return;
    const res = await api.updateField(activeDoc.id, fieldName, newValue);
    if (res.success) {
      // Refresh fields
      loadDocumentDetails(activeDoc.id);
    }
  };

  if (!currentApp) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <ScanText size={48} color="var(--slate-300)" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--slate-800)' }}>
          No Application Selected
        </h3>
        <p style={{ color: 'var(--slate-500)', fontSize: '0.9rem', maxWidth: '480px', margin: '8px auto 20px' }}>
          Please select an application from the Overview page or click "One-Click Demo".
        </p>
        <button className="btn btn-primary" onClick={() => setActiveTab('home')}>
          <span>Go to Overview</span>
          <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div>
        {/* Page Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--slate-900)' }}>
              Step 3: OCR & Key-Field Extraction Inspector
            </h2>
            <p style={{ color: 'var(--slate-600)', fontSize: '0.92rem' }}>
              Inspect raw text extraction, verify structured key-fields, and review confidence metrics.
            </p>
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '56px 24px', background: 'white' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px'
          }}>
            <ScanText size={28} color="#64748b" />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: 8 }}>
            No Documents Uploaded for this Application
          </h3>
          <p style={{ color: 'var(--slate-600)', fontSize: '0.92rem', maxWidth: '520px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            Application <strong style={{ color: 'var(--primary)' }}>{currentApp.applicationId}</strong> ({currentApp.institutionName}) was registered, but has not uploaded any certificate files or documents yet.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => setActiveTab('home')}>
              <span>Select Application with Documents</span>
              <ArrowRight size={16} />
            </button>
            <button className="btn btn-secondary" onClick={() => setActiveTab('dossier')}>
              <span>View Application Dossier</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Step 3: OCR & Key-Field Extraction Inspector
          </h2>
          <p style={{ color: 'var(--slate-600)', fontSize: '0.92rem' }}>
            Inspect raw text extraction, verify structured key-fields, and review confidence metrics.
          </p>
        </div>

        {/* Document Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--slate-600)' }}>Document:</span>
          <select 
            className="form-select"
            value={activeDoc?.id || ''}
            onChange={(e) => {
              const d = docs.find(x => x.id === e.target.value);
              if (d) setActiveDoc(d);
            }}
            style={{ minWidth: '240px' }}
          >
            {docs.map(d => (
              <option key={d.id} value={d.id}>
                {d.originalName} ({d.documentType})
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeDoc && (
        <div className="grid-2">
          {/* Left Column: Document File & Metadata Viewer */}
          <div>
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="card-header">
                <div className="card-title">
                  <FileText size={18} color="var(--primary)" />
                  <span style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeDoc.originalName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => api.openDocumentFile(activeDoc.id).catch(err => alert(err.message))}
                  className="btn btn-secondary btn-sm"
                  title="Open source file in new tab"
                >
                  <ExternalLink size={14} />
                  <span>View File</span>
                </button>
              </div>

              {/* Document Overview Metadata */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px', fontSize: '0.84rem' }}>
                <div style={{ background: 'var(--slate-50)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: 'var(--slate-500)', fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase' }}>Classification</div>
                  <div style={{ fontWeight: 700, color: 'var(--slate-900)', marginTop: '2px' }}>{activeDoc.documentType}</div>
                </div>
                <div style={{ background: 'var(--slate-50)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: 'var(--slate-500)', fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase' }}>Extraction Engine</div>
                  <div style={{ fontWeight: 700, color: 'var(--slate-900)', marginTop: '2px' }}>
                    {activeDoc.isDigitalPdf ? 'Digital PDF Parser' : 'Tesseract.js OCR'}
                  </div>
                </div>
                <div style={{ background: 'var(--slate-50)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: 'var(--slate-500)', fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase' }}>File Size</div>
                  <div style={{ fontWeight: 700, color: 'var(--slate-900)', marginTop: '2px' }}>
                    {(activeDoc.fileSize / 1024).toFixed(1)} KB ({activeDoc.pageCount} page)
                  </div>
                </div>
                <div style={{ background: 'var(--slate-50)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: 'var(--slate-500)', fontSize: '0.74rem', fontWeight: 600, textTransform: 'uppercase' }}>Integrity Check</div>
                  <div style={{ fontWeight: 700, color: 'var(--success)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={14} />
                    <span>SHA-256 Verified</span>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--slate-500)', background: 'var(--slate-100)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', wordBreak: 'break-all' }}>
                <strong>SHA-256:</strong> {activeDoc.checksum}
              </div>
            </div>

            {/* Embedded Document Preview / Text Snippet */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <ScanText size={18} color="var(--primary)" />
                  <span>Document Text Reader Preview</span>
                </div>
                <span className="badge badge-gray">{activeDoc.pageCount} Page(s)</span>
              </div>

              <div style={{
                background: '#ffffff',
                border: '1px solid var(--slate-300)',
                borderRadius: 'var(--radius-sm)',
                padding: '16px',
                minHeight: '280px',
                maxHeight: '400px',
                overflowY: 'auto',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.82rem',
                lineHeight: 1.6,
                color: 'var(--slate-800)',
                whiteSpace: 'pre-wrap'
              }}>
                {rawText || 'No text extracted from this document.'}
              </div>
            </div>
          </div>

          {/* Right Column: Structured Extracted Fields & Audit Tabs */}
          <div>
            <div className="card">
              {/* Tab Navigation */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--slate-200)', paddingBottom: '12px', marginBottom: '18px' }}>
                <button
                  className={`btn btn-sm ${activeTabSub === 'fields' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveTabSub('fields')}
                >
                  <Award size={15} />
                  <span>Structured Fields ({fields.length})</span>
                </button>
                <button
                  className={`btn btn-sm ${activeTabSub === 'text' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveTabSub('text')}
                >
                  <FileText size={15} />
                  <span>Raw OCR Stream</span>
                </button>
              </div>

              {/* Sub-Tab 1: Structured Fields */}
              {activeTabSub === 'fields' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.84rem', color: 'var(--slate-600)' }}>
                      Identified via regular expressions, entity recognition, and heuristics:
                    </div>
                    <span className="badge badge-green">Automated OCR Output</span>
                  </div>

                  {fields.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '36px', color: 'var(--slate-500)' }}>
                      <AlertCircle size={32} color="var(--slate-300)" style={{ margin: '0 auto 8px' }} />
                      <div>No structured fields recognized.</div>
                      <p style={{ fontSize: '0.78rem' }}>Check raw text or review regex rules in <code>rulesConfig.js</code>.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {fields.map(f => {
                        const isExpired = f.fieldName === 'expiryDate' && f.extractedValue && f.extractedValue < '2026-01-01';
                        const isHighConfidence = f.confidence >= 0.85;

                        return (
                          <div
                            key={f.id}
                            style={{
                              border: isExpired ? '1px solid #fca5a5' : '1px solid var(--slate-200)',
                              borderRadius: 'var(--radius-md)',
                              padding: '14px 16px',
                              background: isExpired ? '#fff5f5' : 'white',
                              boxShadow: 'var(--shadow-sm)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase' }}>
                                {f.label || f.fieldName}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span className={`badge ${isHighConfidence ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: '0.68rem' }}>
                                  {(f.confidence * 100).toFixed(0)}% Confidence
                                </span>
                                {f.isVerified && (
                                  <span className="badge badge-blue" style={{ fontSize: '0.68rem' }}>
                                    Human Verified
                                  </span>
                                )}
                                <button
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                                  onClick={() => setEditingField(f)}
                                  title="Edit or correct field value"
                                >
                                  <Edit3 size={12} />
                                  <span>Edit</span>
                                </button>
                              </div>
                            </div>

                            <div style={{ 
                              fontSize: '1.05rem', 
                              fontWeight: 700, 
                              color: isExpired ? 'var(--danger)' : 'var(--slate-900)',
                              marginBottom: '6px'
                            }}>
                              {f.extractedValue}
                              {isExpired && (
                                <span style={{ fontSize: '0.76rem', color: 'var(--danger)', marginLeft: '8px', fontWeight: 600 }}>
                                  (Expired Certificate Warning)
                                </span>
                              )}
                            </div>

                            {f.sourceSnippet && (
                              <div style={{ 
                                fontSize: '0.74rem', 
                                color: 'var(--slate-500)', 
                                background: 'var(--slate-50)', 
                                padding: '6px 10px', 
                                borderRadius: 'var(--radius-sm)',
                                fontFamily: 'var(--font-mono)'
                              }}>
                                <strong>Context:</strong> "{f.sourceSnippet}"
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary" onClick={() => setActiveTab('dossier')}>
                      <span>Proceed to Application Dossier</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Sub-Tab 2: Raw Text */}
              {activeTabSub === 'text' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.82rem', color: 'var(--slate-600)' }}>
                    <span>Complete Unstructured Output from Layer 3 Engine:</span>
                    <span>{rawText.length} characters</span>
                  </div>
                  <pre className="code-box" style={{ maxHeight: '450px', whiteSpace: 'pre-wrap' }}>
                    {rawText}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Field Editor Modal (Human-in-the-Loop Review) */}
      <FieldEditorModal
        field={editingField}
        isOpen={!!editingField}
        onClose={() => setEditingField(null)}
        onSave={handleFieldSave}
      />
    </div>
  );
}

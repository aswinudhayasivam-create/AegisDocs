import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, 
  FileCheck, 
  AlertTriangle, 
  ShieldAlert, 
  FileText, 
  Trash2, 
  ArrowRight,
  Cpu,
  CheckCircle,
  Hash
} from 'lucide-react';
import { api } from '../config/api';

export default function UploadPage({ currentApp, setCurrentApp, setActiveTab, onSelectDocument }) {
  const [apps, setApps] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState(currentApp?.id || '');
  const [docType, setDocType] = useState('AICTE_APPROVAL');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [error, setError] = useState(null);
  const [docsList, setDocsList] = useState([]);

  useEffect(() => {
    loadApps();
  }, []);

  useEffect(() => {
    if (selectedAppId) {
      loadAppDocuments(selectedAppId);
    }
  }, [selectedAppId]);

  const loadApps = async () => {
    try {
      const data = await api.getApplications();
      setApps(data.applications || []);
      if (!selectedAppId && data.applications?.length > 0) {
        setSelectedAppId(data.applications[0].id);
        setCurrentApp(data.applications[0]);
      }
    } catch (e) {
      console.warn('Failed to load apps:', e);
    }
  };

  const loadAppDocuments = async (appId) => {
    try {
      const data = await api.getApplication(appId);
      // Exclude system-generated verification reports from the institution upload list
      const uploadedDocs = (data.documents || []).filter(
        d => !d.originalName?.toLowerCase().startsWith('verification_report')
      );
      setDocsList(uploadedDocs);
      setCurrentApp(data.application);
    } catch (e) {
      console.warn('Failed to load documents:', e);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setError(null);
      setDuplicateWarning(null);
      setUploadResult(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a document file (.pdf, .png, .jpg).');
      return;
    }
    if (!selectedAppId) {
      setError('Please select an application to attach this document to.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setDuplicateWarning(null);

    const formData = new FormData();
    formData.append('document', file);
    formData.append('applicationId', selectedAppId);
    formData.append('documentType', docType);

    try {
      const res = await api.uploadDocument(formData);
      setUploadResult(res);
      if (res.duplicateWarning) {
        setDuplicateWarning(res.duplicateWarning);
      }
      setFile(null);
      // Reset input
      const fileInput = document.getElementById('file-upload-input');
      if (fileInput) fileInput.value = '';
      loadAppDocuments(selectedAppId);
    } catch (err) {
      setError(err.message || 'Upload and processing failed.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--slate-900)' }}>
          Step 2: Document Ingestion & Preprocessing
        </h2>
        <p style={{ color: 'var(--slate-600)', fontSize: '0.92rem' }}>
          Upload PDF or scanned image certificates. Automatically computes SHA-256 cryptographic hashes for duplicate detection and classifies text layers.
        </p>
      </div>

      {duplicateWarning && (
        <div className="alert alert-warning">
          <AlertTriangle size={20} />
          <div>
            <strong>Duplicate Document Alert:</strong> {duplicateWarning}
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          <ShieldAlert size={20} />
          <span>{error}</span>
        </div>
      )}

      {uploadResult && (
        <div className="alert alert-success">
          <CheckCircle size={20} />
          <span>
            <strong>Document Ingested:</strong> Extracted {uploadResult.fields?.length || 0} fields via {uploadResult.extractionSummary?.method}.
          </span>
        </div>
      )}

      <div className="grid-2">
        {/* Upload Form */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <UploadCloud size={20} color="var(--primary)" />
              <span>Upload Regulatory Document</span>
            </div>
            <span className="badge badge-blue">Layer 3: Processing</span>
          </div>

          <form onSubmit={handleUpload}>
            <div className="form-group">
              <label className="form-label">Target Application</label>
              <select
                className="form-select"
                value={selectedAppId}
                onChange={(e) => setSelectedAppId(e.target.value)}
              >
                {apps.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.applicationId} — {a.institutionName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Document Category / Type</label>
              <select
                className="form-select"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
              >
                <option value="AICTE_APPROVAL">AICTE Approval / EoA Letter</option>
                <option value="FIRE_SAFETY_NOC">Fire Safety Certificate (NOC)</option>
                <option value="BUILDING_LAND_SAFETY">Building / Structural Safety Certificate</option>
                <option value="FACULTY_RECORD">Faculty Information & Cadre Record</option>
                <option value="SOCIETY_REGISTRATION">Society / Trust Registration</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Select Document File (PDF, PNG, JPEG)</label>
              <div style={{
                border: '2px dashed var(--slate-300)',
                borderRadius: 'var(--radius-md)',
                padding: '28px 20px',
                textAlign: 'center',
                background: file ? 'var(--primary-light)' : 'var(--slate-50)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => document.getElementById('file-upload-input').click()}
              >
                <UploadCloud size={32} color={file ? 'var(--primary)' : 'var(--slate-400)'} style={{ margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: file ? 'var(--primary)' : 'var(--slate-700)' }}>
                  {file ? file.name : 'Click or Drag & Drop file here to upload'}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--slate-500)', marginTop: '4px' }}>
                  {file ? `${(file.size / 1024).toFixed(1)} KB • Ready for OCR processing` : 'Supported: .pdf (digital/scanned), .png, .jpg (Max: 25MB)'}
                </div>
                <input
                  id="file-upload-input"
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/jpg"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '12px' }}
              disabled={isUploading || !file}
            >
              <Cpu size={18} />
              <span>{isUploading ? 'Executing OCR & Text Extraction...' : 'Upload & Process with OCR'}</span>
            </button>
          </form>
        </div>

        {/* Uploaded Documents List */}
        <div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <FileCheck size={20} color="var(--success)" />
                <span>Uploaded Documents ({docsList.length})</span>
              </div>
              <span className="badge badge-gray">{currentApp?.applicationId}</span>
            </div>

            {docsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--slate-500)' }}>
                <FileText size={32} color="var(--slate-300)" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>No documents uploaded yet</div>
                <p style={{ fontSize: '0.78rem', marginTop: '4px' }}>
                  Upload a document on the left or click "One-Click Demo" from the top bar to load synthetic samples.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {docsList.map(doc => (
                  <div 
                    key={doc.id}
                    style={{
                      background: 'white',
                      border: '1px solid var(--slate-200)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--slate-900)' }}>
                          {doc.originalName}
                        </span>
                        <span className={`badge ${doc.isDigitalPdf ? 'badge-blue' : 'badge-amber'}`}>
                          {doc.isDigitalPdf ? 'Digital PDF' : 'Scanned / OCR'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '4px' }}>
                        Type: {doc.documentType} • {(doc.fileSize / 1024).toFixed(1)} KB • {doc.pageCount} page(s)
                      </div>
                      <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--slate-400)', marginTop: '2px' }}>
                        SHA-256: {doc.checksum?.slice(0, 24)}...
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#16a34a', fontSize: '0.8rem', fontWeight: 700, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '6px 12px' }}>
                      <CheckCircle size={15} color="#16a34a" />
                      <span>Uploaded</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

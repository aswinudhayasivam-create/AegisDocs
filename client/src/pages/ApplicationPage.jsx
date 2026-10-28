import React, { useState, useEffect } from 'react';
import { FileEdit, CheckCircle2, AlertCircle, ArrowRight, Building, User, Mail, Phone, ListChecks } from 'lucide-react';
import { api } from '../config/api';

export default function ApplicationPage({ onApplicationCreated, setActiveTab, defaultInstitutionName = '', defaultEmail = '', submittedBy = '' }) {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('EOA_TECHNICAL');
  const [formData, setFormData] = useState({
    institutionName: defaultInstitutionName,
    institutionId: '',
    applicationId: `APP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    representativeName: '',
    representativeDesignation: 'Principal / Authorized Representative',
    representativeEmail: defaultEmail,
    representativePhone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await api.getCategories();
      setCategories(data.categories || []);
      if (data.categories?.length > 0) {
        setSelectedCategory(data.categories[0].id);
      }
    } catch (err) {
      console.warn('Failed to load categories:', err);
    }
  };

  const currentCatObj = categories.find(c => c.id === selectedCategory) || categories[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.institutionName.trim()) {
      setError('Please provide the full legal name of the educational institution.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.createApplication({
        institutionName: formData.institutionName,
        applicationId: formData.applicationId,
        institutionId: formData.institutionId,
        category: selectedCategory,
        submittedBy: submittedBy || formData.representativeEmail || null,
        representative: {
          name: formData.representativeName,
          designation: formData.representativeDesignation,
          email: formData.representativeEmail,
          phone: formData.representativePhone
        }
      });

      if (res.success && res.application) {
        onApplicationCreated(res.application);
        setActiveTab('upload');
      }
    } catch (err) {
      setError(err.message || 'Failed to submit application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--slate-900)' }}>
          Step 1: Application Registration
        </h2>
        <p style={{ color: 'var(--slate-600)', fontSize: '0.92rem' }}>
          Enter institutional details and generate the mandatory regulatory document checklist.
        </p>
      </div>

      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid-2">
        {/* Left: Registration Form */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Building size={18} color="var(--primary)" />
              <span>Institution Information</span>
            </div>
            <span className="badge badge-blue">Mandatory Step</span>
          </div>

          <div className="form-group" style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 10, padding: 12, marginBottom: 16 }}>
            <label className="form-label">Or import structured application data (Member 4 JSON file)</label>
            <input
              type="file"
              accept=".json,application/json"
              data-testid="import-json"
              onChange={async (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                setError(null);
                try {
                  const data = JSON.parse(await file.text());
                  const res = await api.importApplication(data);
                  onApplicationCreated(res.application);
                } catch (err) {
                  setError('Import failed: ' + err.message);
                }
              }}
            />
            <span style={{ fontSize: '0.74rem', color: 'var(--slate-500)', marginTop: '4px', display: 'block' }}>
              Use demo-data/application_data.json. Blank values are kept so the rules R001-R006 can flag them.
            </span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Institution Legal Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Example Engineering College"
                value={formData.institutionName}
                onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })}
                required
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--slate-500)', marginTop: '4px', display: 'block' }}>
                Must match the registered name on regulatory certificates.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Institution ID</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., INST001"
                value={formData.institutionId}
                onChange={(e) => setFormData({ ...formData, institutionId: e.target.value })}
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--slate-500)', marginTop: '4px', display: 'block' }}>
                Checked by rule R003. Leave blank only to see that rule fail.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Application ID</label>
              <input
                type="text"
                className="form-input"
                value={formData.applicationId}
                onChange={(e) => setFormData({ ...formData, applicationId: e.target.value })}
                style={{ fontFamily: 'var(--font-mono)' }}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Application Category *</label>
              <select
                className="form-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {currentCatObj && (
                <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: '6px' }}>
                  {currentCatObj.description}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '16px', marginTop: '16px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '12px' }}>
                Authorized Representative Contact
              </div>

              <div className="form-group">
                <label className="form-label">Representative Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Dr. R. K. Sharma"
                  value={formData.representativeName}
                  onChange={(e) => setFormData({ ...formData, representativeName: e.target.value })}
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Official Email</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="principal@college.edu.in"
                    value={formData.representativeEmail}
                    onChange={(e) => setFormData({ ...formData, representativeEmail: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Phone</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="+91 98765 43210"
                    value={formData.representativePhone}
                    onChange={(e) => setFormData({ ...formData, representativePhone: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={isSubmitting}>
              <span>{isSubmitting ? 'Registering...' : 'Submit Application & Proceed to Upload'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        </div>

        {/* Right: Dynamic Document Checklist Preview */}
        <div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <ListChecks size={18} color="var(--primary)" />
                <span>Dynamic Document Checklist</span>
              </div>
              <span className="badge badge-amber">Configurable Rules</span>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--slate-600)', marginBottom: '16px' }}>
              Based on the selected application category, the system dynamically generates the expected regulatory documents and compliance rules.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentCatObj?.requiredDocuments?.map((doc, idx) => (
                <div 
                  key={idx}
                  style={{
                    background: 'var(--slate-50)',
                    border: '1px solid var(--slate-200)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}
                >
                  <div style={{ marginTop: '2px', color: 'var(--primary)' }}>
                    <CheckCircle2 size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--slate-900)' }}>
                        {doc.label}
                      </span>
                      {doc.mandatory && (
                        <span className="badge badge-red" style={{ fontSize: '0.68rem' }}>Mandatory</span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--slate-600)', lineHeight: 1.4 }}>
                      {doc.description}
                    </p>
                    <div style={{ marginTop: '6px', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--slate-500)' }}>
                      Type ID: {doc.type}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="alert alert-info" style={{ marginTop: '20px', marginBottom: 0 }}>
              <span style={{ fontSize: '0.82rem' }}>
                💡 <strong>Configurable Rules:</strong> Modify or add new checklist criteria simply by editing <code>config/complianceRules.json</code>.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

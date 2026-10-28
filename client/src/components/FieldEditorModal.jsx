import React, { useState } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';

export default function FieldEditorModal({ field, isOpen, onClose, onSave }) {
  if (!isOpen || !field) return null;

  const [value, setValue] = useState(field.extractedValue || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(field.fieldName, value);
      onClose();
    } catch (err) {
      alert('Error updating field: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-900)' }}>
              Edit Extracted Field
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
              Human-in-the-loop correction for OCR extracted information
            </p>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Field Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={field.label || field.fieldName} 
              disabled 
              style={{ background: 'var(--slate-50)', color: 'var(--slate-600)' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Extracted / Verified Value</label>
            <input 
              type="text" 
              className="form-input" 
              value={value} 
              onChange={(e) => setValue(e.target.value)}
              required 
            />
          </div>

          {field.sourceSnippet && (
            <div style={{ 
              background: 'var(--slate-50)', 
              borderRadius: 'var(--radius-sm)', 
              padding: '12px', 
              marginBottom: '18px',
              border: '1px solid var(--slate-200)'
            }}>
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--slate-500)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Source Text Context (Evidence)
              </div>
              <div style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--slate-700)' }}>
                "{field.sourceSnippet}"
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              <Check size={16} />
              <span>{isSubmitting ? 'Saving...' : 'Save & Mark Verified'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

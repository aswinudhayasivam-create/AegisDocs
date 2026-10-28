import React from 'react';
import { 
  FileText, 
  Upload, 
  Cpu, 
  CheckCircle, 
  Award,
  ChevronRight 
} from 'lucide-react';

export default function WorkflowDiagram({ activeStep = 1, onStepClick }) {
  const steps = [
    {
      num: 1,
      title: 'Registration',
      desc: 'Institution & Category',
      icon: FileText
    },
    {
      num: 2,
      title: 'Ingestion',
      desc: 'Upload & SHA-256 Hash',
      icon: Upload
    },
    {
      num: 3,
      title: 'OCR & Extraction',
      desc: 'PDF-Parse & Tesseract.js',
      icon: Cpu
    },
    {
      num: 4,
      title: 'Validation Engine',
      desc: 'Duplicates & Dates',
      icon: CheckCircle
    },
    {
      num: 5,
      title: 'Compliance Report',
      desc: 'Checklist & Decision',
      icon: Award
    }
  ];

  return (
    <div style={{
      background: 'white',
      borderRadius: 'var(--radius-lg)',
      padding: '20px 24px',
      border: '1px solid var(--slate-200)',
      marginBottom: '24px',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isDoneOrActive = activeStep >= step.num;
          const isCurrent = activeStep === step.num;

          return (
            <React.Fragment key={step.num}>
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: onStepClick ? 'pointer' : 'default',
                  opacity: isDoneOrActive ? 1 : 0.6
                }}
                onClick={() => onStepClick && onStepClick(step.num)}
              >
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: isCurrent 
                    ? 'var(--primary)' 
                    : isDoneOrActive 
                      ? 'var(--primary-light)' 
                      : 'var(--slate-100)',
                  color: isCurrent 
                    ? 'white' 
                    : isDoneOrActive 
                      ? 'var(--primary)' 
                      : 'var(--slate-500)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  boxShadow: isCurrent ? '0 4px 10px rgba(37,99,235,0.3)' : 'none'
                }}>
                  <Icon size={18} />
                </div>
                <div>
                  <div style={{ 
                    fontSize: '0.86rem', 
                    fontWeight: 700, 
                    color: isCurrent ? 'var(--primary)' : 'var(--slate-900)' 
                  }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)' }}>
                    {step.desc}
                  </div>
                </div>
              </div>

              {idx < steps.length - 1 && (
                <ChevronRight size={18} color="var(--slate-300)" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

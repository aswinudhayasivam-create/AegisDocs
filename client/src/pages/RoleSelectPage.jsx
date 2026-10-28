import React from 'react';
import { ShieldCheck, Building2, ArrowRight } from 'lucide-react';

export default function RoleSelectPage({ onSelectRole }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1e40af 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '52px' }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          padding: 10
        }}>
          <img
            src="/logo-shield.png"
            alt="AegisDocs"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>
        <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: 'white', margin: '0 0 10px' }}>
          AegisDocs
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.70)', fontSize: '1rem', maxWidth: 420, margin: '0 auto' }}>
          AICTE Regulatory Verification System — select your role to continue
        </p>
      </div>

      {/* Role Cards */}
      <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 820 }}>

        {/* Institution Holder Card */}
        <button
          onClick={() => onSelectRole('institution')}
          style={{
            width: 360, padding: '36px 32px', borderRadius: 20,
            background: 'rgba(255,255,255,0.08)',
            border: '1.5px solid rgba(255,255,255,0.20)',
            backdropFilter: 'blur(12px)',
            cursor: 'pointer', textAlign: 'left',
            transition: 'all 0.2s',
            color: 'white',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.14)';
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'rgba(34,197,94,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 22,
          }}>
            <Building2 size={28} color="#4ade80" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Institution Holder</h2>
            <ArrowRight size={20} color="rgba(255,255,255,0.5)" />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.875rem', lineHeight: 1.65, margin: 0 }}>
            Submit a new application to AICTE and track the status of your submission — accepted, rejected, or under review.
          </p>
          <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
            {['Submit Application', 'Track Status'].map(t => (
              <span key={t} style={{
                background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.35)',
                color: '#4ade80', borderRadius: 6, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600,
              }}>{t}</span>
            ))}
          </div>
        </button>

        {/* AICTE Authority Card */}
        <button
          onClick={() => onSelectRole('authority')}
          style={{
            width: 360, padding: '36px 32px', borderRadius: 20,
            background: 'rgba(255,255,255,0.08)',
            border: '1.5px solid rgba(255,255,255,0.20)',
            backdropFilter: 'blur(12px)',
            cursor: 'pointer', textAlign: 'left',
            transition: 'all 0.2s',
            color: 'white',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.14)';
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'rgba(99,102,241,0.30)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 22,
          }}>
            <ShieldCheck size={28} color="#818cf8" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>AICTE Authority</h2>
            <ArrowRight size={20} color="rgba(255,255,255,0.5)" />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.875rem', lineHeight: 1.65, margin: 0 }}>
            Review submitted applications, inspect OCR-extracted documents, run compliance checks, and issue accept or reject decisions with a downloadable PDF report.
          </p>
          <div style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['Review', 'OCR Inspect', 'Accept / Reject', 'PDF Report'].map(t => (
              <span key={t} style={{
                background: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.35)',
                color: '#a5b4fc', borderRadius: 6, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600,
              }}>{t}</span>
            ))}
          </div>
        </button>
      </div>

      <p style={{ marginTop: 40, color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}>
        Prototype — no login required. You can switch roles at any time.
      </p>
    </div>
  );
}

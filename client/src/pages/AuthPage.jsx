import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Building2, 
  Lock, 
  User, 
  Mail, 
  Building, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  KeyRound,
  Sparkles
} from 'lucide-react';
import { api } from '../config/api';

export default function AuthPage({ onLoginSuccess }) {
  const [role, setRole] = useState('institution'); // 'institution' | 'authority'
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [emailCheckStatus, setEmailCheckStatus] = useState(null); // { valid: bool, message: string }

  // UI status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setEmail('');
    setConfirmPassword('');
    setInstitutionName('');
    setResetCode('');
    setCodeSent(false);
    setEmailCheckStatus(null);
    setError(null);
    setSuccessMsg(null);
  };

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    resetForm();
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    // Public registration is institution-only: authority accounts are privileged and are
    // provisioned by the administrator (the server also refuses them).
    if (newMode === 'register') setRole('institution');
    setEmailCheckStatus(null);
    setError(null);
    setSuccessMsg(null);
  };

  const handleIdentifierBlur = async () => {
    if (mode !== 'login') return;
    const val = username.trim();
    if (!val || !val.includes('@')) {
      setEmailCheckStatus(null);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) {
      setEmailCheckStatus({ valid: false, message: 'Invalid email format' });
      return;
    }
    try {
      const res = await api.checkEmail(val, role);
      if (res.realLifeValid === false) {
        setEmailCheckStatus({ valid: false, message: '✕ Non-existent domain' });
      } else if (res.exists) {
        setEmailCheckStatus({ valid: true, message: '✓ Registered account' });
      } else {
        setEmailCheckStatus({ valid: false, message: '✕ Email not registered' });
      }
    } catch (_) {
      setEmailCheckStatus(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const identifier = username.trim();
        if (!identifier || !password) {
          throw new Error('Please enter both your email/username and password.');
        }

        // Verify email format and real-life existence if an email address is entered
        if (identifier.includes('@')) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(identifier)) {
            throw new Error('Please enter a valid email address format (e.g. user@institution.edu.in).');
          }

          try {
            const check = await api.checkEmail(identifier, role);
            if (check) {
              if (check.realLifeValid === false) {
                setEmailCheckStatus({ valid: false, message: '✕ Non-existent domain' });
                throw new Error(check.message || 'The email domain does not exist in real life on the internet.');
              }
              if (!check.exists) {
                setEmailCheckStatus({ valid: false, message: '✕ Email not registered' });
                throw new Error(`The email "${identifier}" is not registered in the system. Please verify your email or register a new account.`);
              }
            }
          } catch (checkErr) {
            if (checkErr.message) {
              throw checkErr;
            }
          }
        }

        const res = await api.login(role, identifier, password);
        if (res.success && res.user) {
          onLoginSuccess(res.user);
        } else {
          throw new Error(res.message || 'Login failed.');
        }
      } else if (mode === 'register') {
        if (!username.trim()) throw new Error('Username is required.');
        if (!email.trim() || !email.includes('@')) throw new Error('A valid email address is required.');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          throw new Error('Please enter a valid email format (e.g. user@institution.edu.in).');
        }
        if (role === 'institution' && !institutionName.trim()) {
          throw new Error('Institution name is required.');
        }
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');

        const res = await api.register({
          role,
          username: username.trim(),
          email: email.trim(),
          password,
          institutionName: institutionName.trim()
        });

        if (res.success && res.user) {
          setSuccessMsg('Account registered successfully! Logging you in...');
          setTimeout(() => {
            onLoginSuccess(res.user);
          }, 800);
        }
      } else if (mode === 'forgot') {
        if (!username.trim() || !email.trim()) {
          throw new Error('Please enter both your username and registered email.');
        }
        // Step 1: ask for a code. Step 2: send the code with the new password.
        if (!codeSent) {
          await api.resetPassword({ role, username: username.trim(), email: email.trim() });
          setCodeSent(true);
          setSuccessMsg('A reset code was created. In this demo it is printed in the server window. Enter it below with your new password.');
          setLoading(false);
          return;
        }
        if (password.length < 6) throw new Error('New password must be at least 6 characters.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');
        if (!resetCode.trim()) throw new Error('Enter the reset code from the server window.');

        const res = await api.resetPassword({
          role,
          username: username.trim(),
          email: email.trim(),
          code: resetCode.trim(),
          newPassword: password
        });

        if (res.success) {
          setCodeSent(false);
          setResetCode('');
          setSuccessMsg('Password updated successfully! Please log in with your new password.');
          setMode('login');
          setPassword('');
          setConfirmPassword('');
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication operation failed.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickDemo = (roleType) => {
    setRole(roleType);
    setMode('login');
    setUsername(roleType === 'institution' ? 'institution' : 'authority');
    setPassword('password123');
    setError(null);
  };

  const isInst = role === 'institution';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0b1329 0%, #172554 45%, #1e3a8a 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          padding: 10
        }}>
          <img
            src="/logo-shield.png"
            alt="AegisDocs"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'white', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
          AegisDocs
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.92rem', maxWidth: 440, margin: '0 auto' }}>
          AI-Powered Regulatory Application & Verification System
        </p>
      </div>

      {/* Main Card */}
      <div style={{
        width: '100%',
        maxWidth: 480,
        background: 'rgba(255,255,255,0.98)',
        borderRadius: 20,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        {/* Role Selector Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc'
        }}>
          <button
            type="button"
            onClick={() => handleRoleChange('institution')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '16px 12px',
              border: 'none',
              background: isInst ? 'white' : 'transparent',
              borderBottom: isInst ? '3px solid #2563eb' : '3px solid transparent',
              color: isInst ? '#1e3a8a' : '#64748b',
              fontWeight: isInst ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <Building2 size={18} color={isInst ? '#2563eb' : '#64748b'} />
            <span>Institution Holder</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('authority')}
            disabled={mode === 'register'}
            title={mode === 'register' ? 'Authority accounts cannot be self-registered' : undefined}
            style={{
              flex: 1,
              opacity: mode === 'register' ? 0.45 : 1,
              cursor: mode === 'register' ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '16px 12px',
              border: 'none',
              background: !isInst ? 'white' : 'transparent',
              borderBottom: !isInst ? '3px solid #6366f1' : '3px solid transparent',
              color: !isInst ? '#312e81' : '#64748b',
              fontWeight: !isInst ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <ShieldCheck size={18} color={!isInst ? '#6366f1' : '#64748b'} />
            <span>AICTE Authority</span>
          </button>
        </div>

        {/* Card Body */}
        <div style={{ padding: '32px 30px' }}>
          {/* Form Header */}
          <div style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              {mode === 'login' && `${isInst ? 'Institution Holder' : 'AICTE Authority'} Sign In`}
              {mode === 'register' && `Register as ${isInst ? 'Institution Holder' : 'AICTE Authority'}`}
              {mode === 'forgot' && 'Reset Password'}
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
              {mode === 'login' && 'Enter your credentials to access your dashboard'}
              {mode === 'register' && 'Institutions self-register here. Authority accounts are provisioned by the administrator (demo: sign in as "authority").'}
              {mode === 'forgot' && 'Provide your registered username and email to set a new password'}
            </p>
          </div>

          {/* Feedback messages */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: '#fef2f2', border: '1px solid #fecaca',
              color: '#b91c1c', borderRadius: 10, padding: '10px 14px',
              fontSize: '0.84rem', marginBottom: 18
            }}>
              <AlertCircle size={17} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              color: '#15803d', borderRadius: 10, padding: '10px 14px',
              fontSize: '0.84rem', marginBottom: 18
            }}>
              <CheckCircle2 size={17} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Authentication Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Identifier field (Email or Username) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                  {mode === 'login' ? 'Email Address or Username' : 'Username'}
                </label>
                {mode === 'login' && emailCheckStatus && (
                  <span style={{ 
                    fontSize: '0.74rem', 
                    fontWeight: 700, 
                    color: emailCheckStatus.valid ? '#16a34a' : '#dc2626' 
                  }}>
                    {emailCheckStatus.message}
                  </span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                {mode === 'login' && username.includes('@') ? (
                  <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
                ) : (
                  <User size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
                )}
                <input
                  type="text"
                  required
                  placeholder={
                    mode === 'login'
                      ? (isInst ? 'e.g. institution@example.edu.in or institution' : 'e.g. authority@aicte.gov.in or authority')
                      : (isInst ? 'e.g. institution or tech_college' : 'e.g. authority or officer_aicte')
                  }
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (emailCheckStatus) setEmailCheckStatus(null);
                  }}
                  onBlur={handleIdentifierBlur}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '10px 12px 10px 36px',
                    borderRadius: 10,
                    border: `1.5px solid ${emailCheckStatus ? (emailCheckStatus.valid ? '#86efac' : '#fca5a5') : '#cbd5e1'}`,
                    fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => {
                    if (!emailCheckStatus) e.target.style.borderColor = isInst ? '#2563eb' : '#6366f1';
                  }}
                />
              </div>
            </div>

            {/* Email field (for register or forgot password) */}
            {(mode === 'register' || mode === 'forgot') && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Registered Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
                  <input
                    type="email"
                    required
                    placeholder="e.g. contact@institution.edu.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '10px 12px 10px 36px',
                      borderRadius: 10, border: '1.5px solid #cbd5e1',
                      fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Institution Name (for Institution Register) */}
            {mode === 'register' && isInst && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Institution Legal Name
                </label>
                <div style={{ position: 'relative' }}>
                  <Building size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Institute of Engineering & Technology"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '10px 12px 10px 36px',
                      borderRadius: 10, border: '1.5px solid #cbd5e1',
                      fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Reset code (forgot password, step 2) */}
            {mode === 'forgot' && codeSent && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Reset code (shown in the server window)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit code"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                    borderRadius: 10, border: '1.5px solid #cbd5e1', fontSize: '0.9rem', outline: 'none'
                  }}
                />
              </div>
            )}

            {/* Password field */}
            {(mode !== 'forgot' || codeSent) && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                  {mode === 'forgot' ? 'New Password' : 'Password'}
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => handleModeChange('forgot')}
                    style={{
                      background: 'none', border: 'none',
                      color: isInst ? '#2563eb' : '#6366f1',
                      fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', padding: 0
                    }}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '10px 12px 10px 36px',
                    borderRadius: 10, border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem', outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = isInst ? '#2563eb' : '#6366f1'}
                  onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                />
              </div>
            </div>

            )}

            {/* Confirm Password (for Register & Forgot) */}
            {(mode === 'register' || (mode === 'forgot' && codeSent)) && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  Confirm {mode === 'forgot' ? 'New Password' : 'Password'}
                </label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '10px 12px 10px 36px',
                      borderRadius: 10, border: '1.5px solid #cbd5e1',
                      fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Action Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 6,
                padding: '12px 20px',
                borderRadius: 10,
                border: 'none',
                background: isInst 
                  ? 'linear-gradient(135deg, #1d4ed8, #2563eb)' 
                  : 'linear-gradient(135deg, #4338ca, #6366f1)',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.94rem',
                cursor: loading ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: isInst ? '0 4px 12px rgba(37,99,235,0.3)' : '0 4px 12px rgba(99,102,241,0.3)',
                transition: 'opacity 0.2s'
              }}
            >
              <span>
                {loading 
                  ? 'Processing...' 
                  : mode === 'login' ? 'Sign In to Portal' : mode === 'register' ? 'Register Account' : 'Reset Password'}
              </span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Mode Switchers */}
          <div style={{ marginTop: 20, textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
            {mode === 'login' && (
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleModeChange('register')}
                  style={{
                    background: 'none', border: 'none',
                    color: isInst ? '#2563eb' : '#6366f1',
                    fontWeight: 700, cursor: 'pointer', padding: 0
                  }}
                >
                  Register here
                </button>
              </p>
            )}

            {mode === 'register' && (
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => handleModeChange('login')}
                  style={{
                    background: 'none', border: 'none',
                    color: isInst ? '#2563eb' : '#6366f1',
                    fontWeight: 700, cursor: 'pointer', padding: 0
                  }}
                >
                  Sign in
                </button>
              </p>
            )}

            {mode === 'forgot' && (
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                Remembered your password?{' '}
                <button
                  type="button"
                  onClick={() => handleModeChange('login')}
                  style={{
                    background: 'none', border: 'none',
                    color: isInst ? '#2563eb' : '#6366f1',
                    fontWeight: 700, cursor: 'pointer', padding: 0
                  }}
                >
                  Back to Sign In
                </button>
              </p>
            )}
          </div>

          {/* Quick Demo Credentials Assistant */}
          <div style={{
            marginTop: 22,
            background: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: 12,
            padding: '12px 14px',
            fontSize: '0.78rem',
            color: '#64748b'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
              <Sparkles size={14} color="#f59e0b" />
              <span>Quick Test Credentials:</span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              <button
                type="button"
                onClick={() => fillQuickDemo('institution')}
                style={{
                  background: 'white', border: '1px solid #cbd5e1', borderRadius: 6,
                  padding: '3px 8px', fontSize: '0.75rem', cursor: 'pointer', color: '#1e3a8a', fontWeight: 600
                }}
              >
                Use Institution: institution / password123
              </button>
              <button
                type="button"
                onClick={() => fillQuickDemo('authority')}
                style={{
                  background: 'white', border: '1px solid #cbd5e1', borderRadius: 6,
                  padding: '3px 8px', fontSize: '0.75rem', cursor: 'pointer', color: '#312e81', fontWeight: 600
                }}
              >
                Use Authority: authority / password123
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

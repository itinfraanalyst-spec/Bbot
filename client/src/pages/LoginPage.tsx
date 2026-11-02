import { useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Lock, Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locationSuccess = (location.state as { success?: string } | null)?.success;

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (!isLogin) {
        const res = await fetch('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.detail || 'Registration failed');
        }
        
        setSuccess('Registration successful! Your account is pending admin approval.');
        setIsLogin(true);
        setIsLoading(false);
        return;
      }

      // Login Logic
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const res = await fetch('/auth/login', {
      credentials: "include",
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        if (errData?.detail) {
          throw new Error(errData.detail);
        }
        if (res.status === 502 || res.status === 503 || res.status === 504) {
          throw new Error('Backend server is offline or unreachable. Please make sure the server is running on port 8000.');
        }
        if (res.status >= 500) {
          throw new Error('Server error occurred. Please try again.');
        }
        throw new Error('Invalid username or password');
      }

      login();
      navigate('/'); 
    } catch (err: any) {
      if (err?.name === 'TypeError' && err?.message?.toLowerCase().includes('fetch')) {
        setError('Cannot connect to server. Please check your network or ensure the backend is running.');
      } else {
        setError(err.message || 'An error occurred during authentication');
      }
    } finally {
      setIsLoading(false);
    }
  };

// ... (in the component)

  const handleForgotPassword = async () => {
    if (!username) {
      setSuccess('Ask your administrator for a reset link');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const res = await fetch('/auth/forgot-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      
      if (!res.ok) {
        throw new Error('Failed to request password reset');
      }
      
      setSuccess('If the account exists, the administrator has been notified of your password reset request.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center p-4">
      <div className="w-full max-w-[440px] flex flex-col items-center text-center mt-12 mb-8">
        <img src="/logo.png" alt="TRPW bbot Logo" className="w-[140px] h-[140px] rounded-full object-cover mb-4 shadow-[0_8px_24px_rgba(0,0,0,0.1)]" />
        <h4 className="text-[1.5rem] font-semibold mb-2">Welcome to TRPW <span className="text-[var(--accent)]">bbot</span></h4>
        <p className="text-[var(--text-secondary)] text-[1rem] mb-6">Secure, local-only AI access</p>
        
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] py-1 px-3 rounded-full text-[0.8rem] text-[var(--text-secondary)] flex items-center gap-2">
            <Lock size={14} />
            <span>Admin-approved access</span>
          </div>
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] py-1 px-3 rounded-full text-[0.8rem] text-[var(--text-secondary)] flex items-center gap-2">
            <Shield size={14} />
            <span>Local & Private</span>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] p-6 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] shadow-[0_4px_20px_rgba(0,0,0,0.1)] w-full text-left">
          {error && (
            <div className="bg-[color-mix(in_srgb,var(--error)_10%,transparent)] text-[var(--error)] p-3 rounded-[var(--radius-md)] mb-4 text-sm border border-[color-mix(in_srgb,var(--error)_20%,transparent)] text-center">
              {error}
            </div>
          )}
          {(success || locationSuccess) && (
            <div className="bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)] p-3 rounded-[var(--radius-md)] mb-4 text-sm border border-[color-mix(in_srgb,var(--accent)_20%,transparent)] text-center">
              {success || locationSuccess}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-3 text-[0.95rem] focus:outline-none focus:border-[var(--accent)] transition-colors"
                required
              />
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-3 pr-11 text-[0.95rem] focus:outline-none focus:border-[var(--accent)] transition-colors"
                required
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((previous) => !previous)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium p-3 rounded-[var(--radius-md)] transition-colors mt-2 flex justify-center disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : (isLogin ? 'Log in' : 'Sign up')}
            </button>
          </form>

          {isLogin && (
            <div className="mt-4 flex flex-col items-center gap-3">
              <button type="button" onClick={handleForgotPassword} className="w-full text-center text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                Forgot password?
              </button>
              <button 
                type="button" 
                onClick={() => navigate('/admin-recovery')} 
                className="text-[10px] text-[var(--error)] hover:text-white hover:bg-[var(--error)] uppercase font-bold tracking-wider border border-[color-mix(in_srgb,var(--error)_30%,transparent)] rounded-full px-3 py-1 bg-[color-mix(in_srgb,var(--error)_5%,transparent)] transition-colors"
                title="Only for System Administrators"
              >
                Admin Recovery
              </button>
            </div>
          )}

          <div className="mt-4 text-center">
            <button 
              type="button" 
              onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }} 
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
            </button>
          </div>
          {!isLogin && (
            <p className="mt-3 text-center text-xs text-[var(--text-muted)]">Password: 10+ characters, at most 72 UTF-8 bytes, not your username, and not a common password.</p>
          )}
        </div>
      </div>
      
      <div className="mt-auto pb-4 text-center text-[0.75rem] text-[var(--text-secondary)]">
        TRPW <span className="font-semibold text-[var(--accent)]">bbot</span> <span className="opacity-70">• Local & Private</span>
      </div>
    </div>
  );
}

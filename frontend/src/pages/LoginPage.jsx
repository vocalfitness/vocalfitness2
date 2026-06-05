import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Eye, EyeOff, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { BACKEND_URL } from '../lib/backend';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, loading, setAuth } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [magicState, setMagicState] = useState(null); // 'verifying' | 'success' | 'error' | null

  // Auto-handle magic link tokens from query string
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const magic = params.get('magic');
    if (!magic) return;
    setMagicState('verifying');
    const exchange = async () => {
      try {
        const res = await axios.post(`${BACKEND_URL}/api/auth/magic`, { token: magic });
        const { access_token, user } = res.data;
        if (typeof setAuth === 'function') {
          setAuth(access_token, user);
        }
        setMagicState('success');
        setTimeout(() => navigate('/area-clienti'), 600);
      } catch (e) {
        setMagicState('error');
        setError(e.response?.data?.detail || 'Magic link invalid or expired');
        // Clean URL
        window.history.replaceState({}, '', '/login');
      }
    };
    exchange();
  }, []);

  // Redirect if already logged in
  React.useEffect(() => {
    if (isAuthenticated && !loading && magicState !== 'verifying') {
      navigate('/area-clienti');
    }
  }, [isAuthenticated, loading, navigate, magicState]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await login(username, password);
    
    if (result.success) {
      navigate('/area-clienti');
    } else {
      setError(result.error);
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="w-full max-w-md relative">
        {/* Back to Home */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-blue-300 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Torna alla Home</span>
        </button>

        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
          {/* Logo/Title */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Area Riservata</h1>
            <p className="text-blue-200 text-sm">
              Accedi per visualizzare i contenuti esclusivi
            </p>
          </div>

          {/* Magic link state banner */}
          {magicState === 'verifying' && (
            <div className="mb-6 p-4 bg-blue-500/20 border border-blue-400/40 rounded-lg flex items-center gap-3" data-testid="magic-link-verifying">
              <Loader2 className="w-5 h-5 text-blue-300 animate-spin" />
              <p className="text-blue-100 text-sm">Verifying your magic link…</p>
            </div>
          )}
          {magicState === 'success' && (
            <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-400/40 rounded-lg flex items-center gap-3" data-testid="magic-link-success">
              <Sparkles className="w-5 h-5 text-emerald-300" />
              <p className="text-emerald-100 text-sm">Welcome back. Redirecting to your Members Area…</p>
            </div>
          )}

          {/* Error Message */}
          {error && magicState !== 'success' && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-400/30 rounded-lg">
              <p className="text-red-300 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-blue-200 text-sm font-medium mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                  placeholder="Inserisci username"
                  required
                  data-testid="login-username-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-blue-200 text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                  placeholder="Inserisci password"
                  required
                  data-testid="login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
              data-testid="login-submit-button"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Accesso in corso...
                </>
              ) : (
                'Accedi'
              )}
            </Button>
          </form>

          {/* Help Text */}
          <p className="mt-6 text-center text-blue-300/70 text-sm">
            Non hai un account? Contatta{' '}
            <a href="mailto:admissions@vocalfitness.org" className="text-blue-400 hover:text-white transition-colors">
              admissions@vocalfitness.org
            </a>
          </p>
        </div>

        {/* VocalFitness Branding */}
        <p className="mt-8 text-center text-blue-400/50 text-sm">
          © 2024 VocalFitness - Area Riservata Clienti
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

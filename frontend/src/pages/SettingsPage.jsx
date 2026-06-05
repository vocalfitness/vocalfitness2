import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Lock, Eye, EyeOff, Loader2, 
  CheckCircle, AlertCircle, User, Mail
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../lib/backend';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, token, loading: authLoading } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const backendUrl = BACKEND_URL;

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage(null);

    // Validations
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'La nuova password deve avere almeno 8 caratteri' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Le password non coincidono' });
      return;
    }

    if (currentPassword === newPassword) {
      setMessage({ type: 'error', text: 'La nuova password deve essere diversa dalla precedente' });
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.post(
        `${backendUrl}/api/auth/change-password`,
        {
          current_password: currentPassword,
          new_password: newPassword
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage({ type: 'success', text: 'Password aggiornata con successo!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Errore nel cambio password' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/area-clienti')}
            className="flex items-center gap-2 text-blue-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-white">Impostazioni Account</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* User Info Card */}
        <div className="bg-white/5 backdrop-blur rounded-xl border border-white/10 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Informazioni Account</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-slate-300">
              <User className="w-5 h-5 text-blue-400" />
              <span className="text-slate-400">Username:</span>
              <span className="text-white">{user?.username}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <Mail className="w-5 h-5 text-blue-400" />
              <span className="text-slate-400">Email:</span>
              <span className="text-white">{user?.email || 'Non specificata'}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <Lock className="w-5 h-5 text-blue-400" />
              <span className="text-slate-400">Ruolo:</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                user?.role === 'admin' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'
              }`}>
                {user?.role === 'admin' ? 'Amministratore' : 'Cliente'}
              </span>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white/5 backdrop-blur rounded-xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-400" />
            Cambia Password
          </h2>

          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success' 
                ? 'bg-green-500/20 border border-green-400/30 text-green-300' 
                : 'bg-red-500/20 border border-red-400/30 text-red-300'
            }`}>
              {message.type === 'success' 
                ? <CheckCircle className="w-5 h-5" /> 
                : <AlertCircle className="w-5 h-5" />
              }
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Password Attuale
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Inserisci la password attuale"
                  required
                  data-testid="current-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Nuova Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Inserisci la nuova password (min. 8 caratteri)"
                  required
                  minLength={8}
                  data-testid="new-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {newPassword && newPassword.length < 8 && (
                <p className="mt-1 text-xs text-amber-400">Minimo 8 caratteri</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Conferma Nuova Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-3 bg-slate-700/50 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  confirmPassword && confirmPassword !== newPassword 
                    ? 'border-red-500' 
                    : 'border-slate-600'
                }`}
                placeholder="Ripeti la nuova password"
                required
                data-testid="confirm-password-input"
              />
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="mt-1 text-xs text-red-400">Le password non coincidono</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !currentPassword || !newPassword || newPassword !== confirmPassword}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
              data-testid="change-password-button"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Aggiornamento...
                </>
              ) : (
                'Aggiorna Password'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;

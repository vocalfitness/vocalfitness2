import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Users, FolderOpen, Plus, Trash2, Edit,
  Loader2, Video, FileText, Music, Link as LinkIcon,
  Save, X, Upload, CheckCircle, AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';

const AdminPage = () => {
  const navigate = useNavigate();
  const { user, token, isAdmin, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('content');
  const [contents, setContents] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin())) {
      navigate('/area-clienti');
    }
  }, [user, authLoading, isAdmin, navigate]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      
      try {
        const [contentRes, usersRes] = await Promise.all([
          axios.get(`${backendUrl}/api/admin/content`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${backendUrl}/api/admin/users`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        setContents(contentRes.data);
        setUsers(usersRes.data);
      } catch (error) {
        console.error('Error fetching admin data:', error);
        setMessage({ type: 'error', text: 'Errore nel caricamento dei dati' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, backendUrl]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // Content Management
  const handleCreateContent = async () => {
    setSubmitting(true);
    try {
      const response = await axios.post(
        `${backendUrl}/api/admin/content`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setContents([...contents, response.data]);
      setShowModal(null);
      setFormData({});
      showMessage('success', 'Contenuto creato con successo');
    } catch (error) {
      showMessage('error', error.response?.data?.detail || 'Errore nella creazione');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateContent = async () => {
    setSubmitting(true);
    try {
      await axios.put(
        `${backendUrl}/api/admin/content/${editItem.id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setContents(contents.map(c => c.id === editItem.id ? { ...c, ...formData } : c));
      setShowModal(null);
      setEditItem(null);
      setFormData({});
      showMessage('success', 'Contenuto aggiornato');
    } catch (error) {
      showMessage('error', error.response?.data?.detail || 'Errore nell\'aggiornamento');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteContent = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo contenuto?')) return;
    
    try {
      await axios.delete(`${backendUrl}/api/admin/content/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContents(contents.filter(c => c.id !== id));
      showMessage('success', 'Contenuto eliminato');
    } catch (error) {
      showMessage('error', 'Errore nell\'eliminazione');
    }
  };

  // User Management
  const handleCreateUser = async () => {
    setSubmitting(true);
    try {
      const response = await axios.post(
        `${backendUrl}/api/admin/users`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers([...users, response.data]);
      setShowModal(null);
      setFormData({});
      showMessage('success', 'Utente creato con successo');
    } catch (error) {
      showMessage('error', error.response?.data?.detail || 'Errore nella creazione');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo utente?')) return;
    
    try {
      await axios.delete(`${backendUrl}/api/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(users.filter(u => u.id !== id));
      showMessage('success', 'Utente eliminato');
    } catch (error) {
      showMessage('error', 'Errore nell\'eliminazione');
    }
  };

  const getContentIcon = (type) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4 text-blue-400" />;
      case 'pdf': return <FileText className="w-4 h-4 text-green-400" />;
      case 'audio': return <Music className="w-4 h-4 text-purple-400" />;
      case 'link': return <LinkIcon className="w-4 h-4 text-cyan-400" />;
      default: return <FolderOpen className="w-4 h-4 text-gray-400" />;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/area-clienti')}
              className="flex items-center gap-2 text-blue-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-white">Pannello Admin</h1>
          </div>
          <p className="text-blue-300 text-sm">Gestione Area Riservata</p>
        </div>
      </header>

      {/* Message Toast */}
      {message && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
          message.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        } text-white`}>
          {message.text}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <Button
            onClick={() => setActiveTab('content')}
            className={activeTab === 'content' 
              ? 'bg-blue-600' 
              : 'bg-slate-700 hover:bg-slate-600'}
            data-testid="tab-content"
          >
            <FolderOpen className="w-4 h-4 mr-2" /> Contenuti ({contents.length})
          </Button>
          <Button
            onClick={() => setActiveTab('users')}
            className={activeTab === 'users' 
              ? 'bg-blue-600' 
              : 'bg-slate-700 hover:bg-slate-600'}
            data-testid="tab-users"
          >
            <Users className="w-4 h-4 mr-2" /> Utenti ({users.length})
          </Button>
        </div>

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-white">Gestione Contenuti</h2>
              <Button
                onClick={() => {
                  setFormData({ content_type: 'video', order: 0 });
                  setShowModal('create-content');
                }}
                className="bg-green-600 hover:bg-green-700"
                data-testid="add-content-button"
              >
                <Plus className="w-4 h-4 mr-2" /> Aggiungi Contenuto
              </Button>
            </div>

            {contents.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/50 rounded-xl">
                <FolderOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Nessun contenuto. Aggiungi il primo!</p>
              </div>
            ) : (
              <div className="bg-slate-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Tipo</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Titolo</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Categoria</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Ordine</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-slate-300">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contents.map(content => (
                      <tr key={content.id} className="border-t border-slate-700 hover:bg-slate-700/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getContentIcon(content.content_type)}
                            <span className="text-sm text-slate-400">{content.content_type}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white">{content.title}</td>
                        <td className="px-4 py-3 text-slate-400">{content.category || '-'}</td>
                        <td className="px-4 py-3 text-slate-400">{content.order}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              onClick={() => {
                                setEditItem(content);
                                setFormData(content);
                                setShowModal('edit-content');
                              }}
                              variant="ghost"
                              size="sm"
                              className="text-blue-400 hover:bg-blue-500/20"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => handleDeleteContent(content.id)}
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:bg-red-500/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-white">Gestione Utenti</h2>
              <Button
                onClick={() => {
                  setFormData({ role: 'client' });
                  setShowModal('create-user');
                }}
                className="bg-green-600 hover:bg-green-700"
                data-testid="add-user-button"
              >
                <Plus className="w-4 h-4 mr-2" /> Nuovo Utente
              </Button>
            </div>

            <div className="bg-slate-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Username</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Nome Completo</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Ruolo</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-slate-300">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-t border-slate-700 hover:bg-slate-700/50">
                      <td className="px-4 py-3 text-white">{u.username}</td>
                      <td className="px-4 py-3 text-slate-300">{u.full_name || '-'}</td>
                      <td className="px-4 py-3 text-slate-400">{u.email || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          u.role === 'admin' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {u.username !== 'admin' && (
                          <Button
                            onClick={() => handleDeleteUser(u.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:bg-red-500/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {showModal === 'create-content' && 'Nuovo Contenuto'}
                {showModal === 'edit-content' && 'Modifica Contenuto'}
                {showModal === 'create-user' && 'Nuovo Utente'}
              </h3>
              <Button
                onClick={() => { setShowModal(null); setEditItem(null); setFormData({}); }}
                variant="ghost"
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              {/* Content Form */}
              {(showModal === 'create-content' || showModal === 'edit-content') && (
                <>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Titolo *</label>
                    <input
                      type="text"
                      value={formData.title || ''}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      placeholder="Es: Lezione 1 - Introduzione"
                      data-testid="content-title-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Descrizione</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      rows={3}
                      placeholder="Descrizione del contenuto..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">Tipo *</label>
                      <select
                        value={formData.content_type || 'video'}
                        onChange={e => setFormData({ ...formData, content_type: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        data-testid="content-type-select"
                      >
                        <option value="video">Video</option>
                        <option value="pdf">PDF</option>
                        <option value="audio">Audio</option>
                        <option value="link">Link</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">Categoria</label>
                      <input
                        type="text"
                        value={formData.category || ''}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        placeholder="Es: Corso Base"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">URL Contenuto *</label>
                    <input
                      type="url"
                      value={formData.url || ''}
                      onChange={e => setFormData({ ...formData, url: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      placeholder="https://..."
                      data-testid="content-url-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">URL Thumbnail (opzionale)</label>
                    <input
                      type="url"
                      value={formData.thumbnail_url || ''}
                      onChange={e => setFormData({ ...formData, thumbnail_url: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Ordine</label>
                    <input
                      type="number"
                      value={formData.order || 0}
                      onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    />
                  </div>
                </>
              )}

              {/* User Form */}
              {showModal === 'create-user' && (
                <>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Username *</label>
                    <input
                      type="text"
                      value={formData.username || ''}
                      onChange={e => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      placeholder="Es: mario.rossi"
                      data-testid="user-username-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Password *</label>
                    <input
                      type="password"
                      value={formData.password || ''}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      placeholder="Password sicura"
                      data-testid="user-password-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Nome Completo</label>
                    <input
                      type="text"
                      value={formData.full_name || ''}
                      onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      placeholder="Es: Mario Rossi"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      placeholder="mario@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Ruolo</label>
                    <select
                      value={formData.role || 'client'}
                      onChange={e => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      data-testid="user-role-select"
                    >
                      <option value="client">Cliente</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
              <Button
                onClick={() => { setShowModal(null); setEditItem(null); setFormData({}); }}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Annulla
              </Button>
              <Button
                onClick={() => {
                  if (showModal === 'create-content') handleCreateContent();
                  else if (showModal === 'edit-content') handleUpdateContent();
                  else if (showModal === 'create-user') handleCreateUser();
                }}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="save-button"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Salva
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;

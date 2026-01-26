import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Users, FolderOpen, Plus, Trash2, Edit,
  Loader2, Video, FileText, Music, Link as LinkIcon,
  Save, X, Upload, CheckCircle, AlertCircle, HardDrive,
  Folder, Eye, EyeOff, UserCheck, Youtube, RefreshCw, ExternalLink
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';

const AdminPage = () => {
  const navigate = useNavigate();
  const { user, token, isAdmin, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('folders');
  const [contents, setContents] = useState([]);
  const [folders, setFolders] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [storageStats, setStorageStats] = useState(null);
  const [databaseStats, setDatabaseStats] = useState(null);
  const [youtubePlaylists, setYoutubePlaylists] = useState([]);
  const [youtubeImporting, setYoutubeImporting] = useState(false);
  const [youtubeSyncing, setYoutubeSyncing] = useState(null);
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
        const [contentRes, foldersRes, usersRes, storageRes, dbRes, youtubeRes] = await Promise.all([
          axios.get(`${backendUrl}/api/admin/content`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${backendUrl}/api/admin/folders`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${backendUrl}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${backendUrl}/api/admin/storage/stats`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${backendUrl}/api/admin/database/stats`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${backendUrl}/api/admin/youtube/playlists`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
        ]);
        
        setContents(contentRes.data);
        setFolders(foldersRes.data);
        setUsers(usersRes.data);
        setStorageStats(storageRes.data);
        setDatabaseStats(dbRes.data);
        setYoutubePlaylists(youtubeRes.data || []);
      } catch (error) {
        console.error('Error fetching admin data:', error);
        setMessage({ type: 'error', text: 'Errore nel caricamento dei dati' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, backendUrl]);

  const showToast = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // Get client users (not admins)
  const clientUsers = users.filter(u => u.role === 'client');

  // File Upload Handler
  const handleFileUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);
    setUploadProgress(0);
    
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    
    try {
      const response = await axios.post(
        `${backendUrl}/api/admin/upload`,
        formDataUpload,
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        }
      );
      
      setFormData(prev => ({
        ...prev,
        url: `${backendUrl}${response.data.url}`,
        content_type: response.data.file_type === 'image' ? 'link' : response.data.file_type
      }));
      
      showToast('success', `File "${response.data.original_filename}" caricato!`);
    } catch (error) {
      showToast('error', error.response?.data?.detail || 'Errore nel caricamento');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // ===================== FOLDER HANDLERS =====================
  const handleCreateFolder = async () => {
    setSubmitting(true);
    try {
      const response = await axios.post(
        `${backendUrl}/api/admin/folders`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFolders([...folders, response.data]);
      setShowModal(null);
      setFormData({});
      showToast('success', 'Cartella creata con successo');
    } catch (error) {
      showToast('error', error.response?.data?.detail || 'Errore nella creazione');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateFolder = async () => {
    setSubmitting(true);
    try {
      await axios.put(
        `${backendUrl}/api/admin/folders/${editItem.id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFolders(folders.map(f => f.id === editItem.id ? { ...f, ...formData } : f));
      setShowModal(null);
      setEditItem(null);
      setFormData({});
      showToast('success', 'Cartella aggiornata');
    } catch (error) {
      showToast('error', error.response?.data?.detail || 'Errore nell\'aggiornamento');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFolder = async (id) => {
    if (!window.confirm('Sei sicuro? I contenuti non verranno eliminati ma scollegati dalla cartella.')) return;
    try {
      await axios.delete(`${backendUrl}/api/admin/folders/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setFolders(folders.filter(f => f.id !== id));
      showToast('success', 'Cartella eliminata');
    } catch (error) {
      showToast('error', 'Errore nell\'eliminazione');
    }
  };

  // ===================== CONTENT HANDLERS =====================
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
      showToast('success', 'Contenuto creato con successo');
    } catch (error) {
      showToast('error', error.response?.data?.detail || 'Errore nella creazione');
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
      showToast('success', 'Contenuto aggiornato');
    } catch (error) {
      showToast('error', error.response?.data?.detail || 'Errore nell\'aggiornamento');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteContent = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo contenuto?')) return;
    try {
      await axios.delete(`${backendUrl}/api/admin/content/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setContents(contents.filter(c => c.id !== id));
      showToast('success', 'Contenuto eliminato');
    } catch (error) {
      showToast('error', 'Errore nell\'eliminazione');
    }
  };

  // ===================== USER HANDLERS =====================
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
      showToast('success', 'Utente creato con successo');
    } catch (error) {
      showToast('error', error.response?.data?.detail || 'Errore nella creazione');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo utente?')) return;
    try {
      await axios.delete(`${backendUrl}/api/admin/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(users.filter(u => u.id !== id));
      showToast('success', 'Utente eliminato');
    } catch (error) {
      showToast('error', 'Errore nell\'eliminazione');
    }
  };

  // Toggle user in selection
  const toggleUserSelection = (userId) => {
    const currentUsers = formData.assigned_users || [];
    if (currentUsers.includes(userId)) {
      setFormData({ ...formData, assigned_users: currentUsers.filter(id => id !== userId) });
    } else {
      setFormData({ ...formData, assigned_users: [...currentUsers, userId] });
    }
  };

  // Get username by ID
  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? (user.full_name || user.username) : userId;
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
            <button onClick={() => navigate('/area-clienti')} className="text-blue-300 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-white">Pannello Admin</h1>
          </div>
          <p className="text-blue-300 text-sm">Gestione Area Riservata</p>
        </div>
      </header>

      {/* Message Toast */}
      {message && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white`}>
          {message.text}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Button onClick={() => setActiveTab('folders')} className={activeTab === 'folders' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'} data-testid="tab-folders">
            <Folder className="w-4 h-4 mr-2" /> Cartelle ({folders.length})
          </Button>
          <Button onClick={() => setActiveTab('content')} className={activeTab === 'content' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'} data-testid="tab-content">
            <FolderOpen className="w-4 h-4 mr-2" /> Contenuti ({contents.length})
          </Button>
          <Button onClick={() => setActiveTab('users')} className={activeTab === 'users' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'} data-testid="tab-users">
            <Users className="w-4 h-4 mr-2" /> Utenti ({users.length})
          </Button>
          <Button onClick={() => setActiveTab('database')} className={activeTab === 'database' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'} data-testid="tab-database">
            <HardDrive className="w-4 h-4 mr-2" /> Database
          </Button>
        </div>

        {/* Storage Stats */}
        {storageStats && (
          <div className="mb-6 bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-slate-300">
                <HardDrive className="w-5 h-5 text-blue-400" />
                <span className="font-medium">Spazio di Archiviazione</span>
              </div>
              <span className="text-sm text-slate-400">{storageStats.file_count} file • Max {storageStats.max_file_size_formatted}/file</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3 mb-2">
              <div className={`h-3 rounded-full transition-all ${storageStats.usage_percentage > 90 ? 'bg-red-500' : storageStats.usage_percentage > 70 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(storageStats.usage_percentage, 100)}%` }} />
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Usato: {storageStats.total_used_formatted}</span>
              <span>{storageStats.usage_percentage}%</span>
              <span>Disponibile: {storageStats.remaining_formatted}</span>
            </div>
          </div>
        )}

        {/* ===================== FOLDERS TAB ===================== */}
        {activeTab === 'folders' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-white">Gestione Cartelle</h2>
              <Button onClick={() => { setFormData({ is_public: true, assigned_users: [], order: 0 }); setShowModal('create-folder'); }} className="bg-green-600 hover:bg-green-700" data-testid="add-folder-button">
                <Plus className="w-4 h-4 mr-2" /> Nuova Cartella
              </Button>
            </div>

            {folders.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/50 rounded-xl">
                <Folder className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Nessuna cartella. Crea la prima per organizzare i contenuti!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {folders.map(folder => (
                  <div key={folder.id} className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-blue-500/50 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                          <Folder className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{folder.name}</h3>
                          <p className="text-sm text-slate-400">{folder.content_count} contenuti</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button onClick={() => { setEditItem(folder); setFormData(folder); setShowModal('edit-folder'); }} variant="ghost" size="sm" className="text-blue-400 hover:bg-blue-500/20">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button onClick={() => handleDeleteFolder(folder.id)} variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/20">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {folder.description && <p className="text-sm text-slate-400 mb-3">{folder.description}</p>}
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-1 rounded text-xs ${folder.is_public ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'}`}>
                        {folder.is_public ? <><Eye className="w-3 h-3 inline mr-1" /> Pubblica</> : <><EyeOff className="w-3 h-3 inline mr-1" /> Riservata</>}
                      </span>
                      {folder.assigned_users?.length > 0 && (
                        <span className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-300">
                          <UserCheck className="w-3 h-3 inline mr-1" /> {folder.assigned_users.length} utenti
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===================== CONTENT TAB ===================== */}
        {activeTab === 'content' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-white">Gestione Contenuti</h2>
              <Button onClick={() => { setFormData({ content_type: 'video', is_public: true, assigned_users: [], order: 0 }); setShowModal('create-content'); }} className="bg-green-600 hover:bg-green-700" data-testid="add-content-button">
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
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Cartella</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Visibilità</th>
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
                        <td className="px-4 py-3 text-slate-400">{content.folder_name || <span className="text-slate-600">—</span>}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {content.is_public ? (
                              <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-300">Pubblica</span>
                            ) : (
                              <span className="px-2 py-1 rounded text-xs bg-amber-500/20 text-amber-300">Riservata</span>
                            )}
                            {content.assigned_users?.length > 0 && (
                              <span className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-300">{content.assigned_users.length} utenti</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-2 justify-end">
                            <Button onClick={() => { setEditItem(content); setFormData(content); setShowModal('edit-content'); }} variant="ghost" size="sm" className="text-blue-400 hover:bg-blue-500/20">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button onClick={() => handleDeleteContent(content.id)} variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/20">
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

        {/* ===================== USERS TAB ===================== */}
        {activeTab === 'users' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-white">Gestione Utenti</h2>
              <Button onClick={() => { setFormData({ role: 'client' }); setShowModal('create-user'); }} className="bg-green-600 hover:bg-green-700" data-testid="add-user-button">
                <Plus className="w-4 h-4 mr-2" /> Nuovo Utente
              </Button>
            </div>

            <div className="bg-slate-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Username</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Nome</th>
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
                        <span className={`px-2 py-1 rounded text-xs font-medium ${u.role === 'admin' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'}`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {u.username !== 'admin' && (
                          <Button onClick={() => handleDeleteUser(u.id)} variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/20">
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

        {/* ===================== DATABASE TAB ===================== */}
        {activeTab === 'database' && databaseStats && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-6">Statistiche Database</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <p className="text-slate-400 text-sm">Dimensione Dati</p>
                <p className="text-2xl font-bold text-white">{databaseStats.total_size_formatted}</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <p className="text-slate-400 text-sm">Dimensione Indici</p>
                <p className="text-2xl font-bold text-blue-400">{databaseStats.index_size_formatted}</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <p className="text-slate-400 text-sm">Collezioni</p>
                <p className="text-2xl font-bold text-green-400">{databaseStats.total_collections}</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <p className="text-slate-400 text-sm">Indici Totali</p>
                <p className="text-2xl font-bold text-purple-400">{databaseStats.total_indexes}</p>
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Collezione</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Documenti</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Indici</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(databaseStats.collections || {}).map(([name, info]) => (
                    <tr key={name} className="border-t border-slate-700 hover:bg-slate-700/50">
                      <td className="px-4 py-3 text-white font-medium">{name}</td>
                      <td className="px-4 py-3 text-slate-300">{info.document_count}</td>
                      <td className="px-4 py-3"><span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">{info.index_count}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ===================== MODAL ===================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {showModal === 'create-folder' && 'Nuova Cartella'}
                {showModal === 'edit-folder' && 'Modifica Cartella'}
                {showModal === 'create-content' && 'Nuovo Contenuto'}
                {showModal === 'edit-content' && 'Modifica Contenuto'}
                {showModal === 'create-user' && 'Nuovo Utente'}
              </h3>
              <Button onClick={() => { setShowModal(null); setEditItem(null); setFormData({}); }} variant="ghost" className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              {/* =================== FOLDER FORM =================== */}
              {(showModal === 'create-folder' || showModal === 'edit-folder') && (
                <>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Nome Cartella *</label>
                    <input type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder="Es: Corso Base" data-testid="folder-name-input" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Descrizione</label>
                    <textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" rows={2} placeholder="Descrizione della cartella..." />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">URL Immagine (opzionale)</label>
                    <input type="url" value={formData.thumbnail_url || ''} onChange={e => setFormData({ ...formData, thumbnail_url: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder="https://..." />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.is_public !== false} onChange={e => setFormData({ ...formData, is_public: e.target.checked })} className="w-4 h-4 rounded" />
                      <span className="text-slate-300">Pubblica (visibile a tutti i clienti)</span>
                    </label>
                  </div>
                  
                  {!formData.is_public && clientUsers.length > 0 && (
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">Assegna a clienti specifici</label>
                      <div className="max-h-40 overflow-y-auto bg-slate-700/50 rounded-lg p-2 space-y-1">
                        {clientUsers.map(u => (
                          <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-slate-600/50 rounded cursor-pointer">
                            <input type="checkbox" checked={(formData.assigned_users || []).includes(u.id)} onChange={() => toggleUserSelection(u.id)} className="w-4 h-4 rounded" />
                            <span className="text-white">{u.full_name || u.username}</span>
                            <span className="text-slate-400 text-sm">({u.email || u.username})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Ordine</label>
                    <input type="number" value={formData.order || 0} onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" />
                  </div>
                </>
              )}

              {/* =================== CONTENT FORM =================== */}
              {(showModal === 'create-content' || showModal === 'edit-content') && (
                <>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Titolo *</label>
                    <input type="text" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder="Es: Lezione 1" data-testid="content-title-input" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Descrizione</label>
                    <textarea value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">Tipo *</label>
                      <select value={formData.content_type || 'video'} onChange={e => setFormData({ ...formData, content_type: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" data-testid="content-type-select">
                        <option value="video">Video</option>
                        <option value="pdf">PDF</option>
                        <option value="audio">Audio</option>
                        <option value="link">Link</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">Cartella</label>
                      <select value={formData.folder_id || ''} onChange={e => setFormData({ ...formData, folder_id: e.target.value || null })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                        <option value="">— Nessuna cartella —</option>
                        {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  {/* File Upload */}
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">Carica File</label>
                    <div className={`border-2 border-dashed rounded-lg p-4 text-center ${isUploading ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 hover:border-blue-500/50'}`}>
                      {isUploading ? (
                        <div className="space-y-2">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" />
                          <div className="w-full bg-slate-600 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{ width: `${uploadProgress}%` }} /></div>
                          <p className="text-sm text-blue-300">{uploadProgress}%</p>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                          <input ref={fileInputRef} type="file" accept=".mp4,.webm,.mov,.mp3,.wav,.ogg,.pdf,.jpg,.jpeg,.png,.gif,.webp" onChange={(e) => handleFileUpload(e.target.files[0])} className="hidden" />
                          <Button type="button" onClick={() => fileInputRef.current?.click()} variant="outline" size="sm" className="border-slate-500 text-slate-300">Seleziona File</Button>
                          <p className="text-xs text-slate-500 mt-1">Max 100MB</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-300 mb-1">URL Contenuto *</label>
                    <div className="relative">
                      <input type="url" value={formData.url || ''} onChange={e => setFormData({ ...formData, url: e.target.value })} className={`w-full px-3 py-2 bg-slate-700 border rounded-lg text-white ${formData.url ? 'border-green-500' : 'border-slate-600'}`} placeholder="https://..." data-testid="content-url-input" />
                      {formData.url && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.is_public !== false} onChange={e => setFormData({ ...formData, is_public: e.target.checked })} className="w-4 h-4 rounded" />
                      <span className="text-slate-300">Pubblico (visibile a tutti)</span>
                    </label>
                  </div>

                  {!formData.is_public && clientUsers.length > 0 && (
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">Assegna a clienti specifici</label>
                      <div className="max-h-40 overflow-y-auto bg-slate-700/50 rounded-lg p-2 space-y-1">
                        {clientUsers.map(u => (
                          <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-slate-600/50 rounded cursor-pointer">
                            <input type="checkbox" checked={(formData.assigned_users || []).includes(u.id)} onChange={() => toggleUserSelection(u.id)} className="w-4 h-4 rounded" />
                            <span className="text-white">{u.full_name || u.username}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* =================== USER FORM =================== */}
              {showModal === 'create-user' && (
                <>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Username *</label>
                    <input type="text" value={formData.username || ''} onChange={e => setFormData({ ...formData, username: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder="Es: mario.rossi" data-testid="user-username-input" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Password *</label>
                    <input type="password" value={formData.password || ''} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder="Password sicura" data-testid="user-password-input" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Nome Completo</label>
                    <input type="text" value={formData.full_name || ''} onChange={e => setFormData({ ...formData, full_name: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder="Es: Mario Rossi" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Email</label>
                    <input type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder="mario@email.com" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Ruolo</label>
                    <select value={formData.role || 'client'} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                      <option value="client">Cliente</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-slate-700 flex justify-end gap-2">
              <Button onClick={() => { setShowModal(null); setEditItem(null); setFormData({}); }} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">Annulla</Button>
              <Button onClick={() => {
                if (showModal === 'create-folder') handleCreateFolder();
                else if (showModal === 'edit-folder') handleUpdateFolder();
                else if (showModal === 'create-content') handleCreateContent();
                else if (showModal === 'edit-content') handleUpdateContent();
                else if (showModal === 'create-user') handleCreateUser();
              }} disabled={submitting} className="bg-blue-600 hover:bg-blue-700" data-testid="save-button">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}Salva
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;

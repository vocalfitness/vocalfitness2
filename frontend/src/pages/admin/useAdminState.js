/**
 * useAdminState — all state + handlers for the AdminPage.
 *
 * Extracted from AdminPage.jsx so the page component can focus on layout
 * and composition. The hook owns:
 *   - useState / useRef declarations (~40 state vars, 4 refs)
 *   - CRM section collapse state
 *   - useEffect side effects (auth guard + data fetch)
 *   - showToast helper + all CRUD handlers for folders / content / users /
 *     messaging / leads / youtube / popups
 *
 * Consumers destructure the return object and pass slices to the modular
 * tab components (AdminLeadsTab, AdminMessagingTab, …). Every identifier
 * exposed by this hook was previously a top-level `const` inside
 * `AdminPage`, so the JSX is unchanged.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Video, FileText, Music, Link as LinkIcon, FolderOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { sanitizeRichHtml } from '../../components/RichTextEditor';
import { BACKEND_URL } from '../../lib/backend';
import { adminTranslations } from '../adminTranslations';

export const useAdminState = () => {
  const navigate = useNavigate();
  const { user, token, isAdmin, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const t = adminTranslations[language] || adminTranslations.en;
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
  // Lead Inbox
  const [leads, setLeads] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadFilters, setLeadFilters] = useState({ source: '', englishLevel: '', role: '', sector: '', nativeLanguage: '', status: '', search: '' });
  const [selectedLead, setSelectedLead] = useState(null);
  const [youtubePlaylists, setYoutubePlaylists] = useState([]);
  const [youtubeImporting, setYoutubeImporting] = useState(false);
  const [youtubeSyncing, setYoutubeSyncing] = useState(null);
  const [popupMessages, setPopupMessages] = useState([]);
  const [popupStats, setPopupStats] = useState({});
  const [popupMediaUploading, setPopupMediaUploading] = useState(false);
  const [popupMediaProgress, setPopupMediaProgress] = useState(0);
  const [conversations, setConversations] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatUser, setChatUser] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [newMessageHtml, setNewMessageHtml] = useState('');
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [msgType, setMsgType] = useState('text');
  const [msgMediaUrl, setMsgMediaUrl] = useState('');
  const [msgTaskDesc, setMsgTaskDesc] = useState('');
  const [msgTaskDue, setMsgTaskDue] = useState('');
  const [msgFileName, setMsgFileName] = useState('');
  const chatEndRef = useRef(null);
  const popupFileInputRef = useRef(null);
  const thumbnailFileInputRef = useRef(null);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [regeneratingThumbs, setRegeneratingThumbs] = useState(false);
  const [regeneratingThumbId, setRegeneratingThumbId] = useState(null);
  const fileInputRef = useRef(null);
  // State for collapsible CRM sections
  const [crmSections, setCrmSections] = useState({
    anagrafica: true,
    azienda: false,
    social: false,
    marketing: false,
    notes: false
  });

  const toggleCrmSection = (section) => {
    setCrmSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const backendUrl = BACKEND_URL;

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
        const [contentRes, foldersRes, usersRes, storageRes, dbRes, youtubeRes, popupsRes] = await Promise.all([
          axios.get(`${backendUrl}/api/admin/content`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${backendUrl}/api/admin/folders`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${backendUrl}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${backendUrl}/api/admin/storage/stats`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${backendUrl}/api/admin/database/stats`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${backendUrl}/api/admin/youtube/playlists`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
          axios.get(`${backendUrl}/api/admin/popups`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
        ]);
        
        setContents(contentRes.data);
        setFolders(foldersRes.data);
        setUsers(usersRes.data);
        setStorageStats(storageRes.data);
        setDatabaseStats(dbRes.data);
        setYoutubePlaylists(youtubeRes.data || []);
        setPopupMessages(popupsRes.data || []);

        // Fetch popup stats separately
        try {
          const statsRes = await axios.get(`${backendUrl}/api/admin/popups/stats`, { headers: { Authorization: `Bearer ${token}` } });
          setPopupStats(statsRes.data || {});
        } catch {}
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
        content_type: response.data.file_type === 'image' ? 'link' : response.data.file_type,
        thumbnail_url: response.data.thumbnail_url 
          ? (response.data.thumbnail_url.startsWith('http') ? response.data.thumbnail_url : `${backendUrl}${response.data.thumbnail_url}`)
          : prev.thumbnail_url || ''
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

  // ===================== THUMBNAIL HANDLERS =====================
  const handleCustomThumbnailUpload = async (file) => {
    if (!file) return;
    setThumbnailUploading(true);
    const uploadData = new FormData();
    uploadData.append('file', file);
    try {
      const response = await axios.post(`${backendUrl}/api/admin/thumbnail/upload`, uploadData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setFormData(prev => ({ ...prev, thumbnail_url: `${backendUrl}${response.data.thumbnail_url}` }));
      showToast('success', language === 'it' ? 'Anteprima caricata!' : 'Thumbnail uploaded!');
    } catch (error) {
      showToast('error', error.response?.data?.detail || 'Errore');
    } finally {
      setThumbnailUploading(false);
    }
  };

  const autoGenerateThumbnailFromUrl = async (url) => {
    if (!url) return;
    try {
      const response = await axios.post(`${backendUrl}/api/admin/thumbnail/generate-from-url`, 
        { url }, { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success && response.data.thumbnail_url) {
        setFormData(prev => ({ ...prev, thumbnail_url: response.data.thumbnail_url }));
      }
    } catch {}
  };

  const handleRegenerateThumbnail = async (contentId) => {
    setRegeneratingThumbId(contentId);
    try {
      const response = await axios.post(`${backendUrl}/api/admin/content/${contentId}/regenerate-thumbnail`, {}, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.success) {
        setContents(prev => prev.map(c => c.id === contentId ? { ...c, thumbnail_url: response.data.thumbnail_url } : c));
        showToast('success', language === 'it' ? 'Anteprima rigenerata!' : 'Thumbnail regenerated!');
      } else {
        showToast('error', response.data.message || (language === 'it' ? 'Nessuna anteprima disponibile' : 'No thumbnail available'));
      }
    } catch {
      showToast('error', 'Errore');
    } finally {
      setRegeneratingThumbId(null);
    }
  };

  const handleRegenerateAllThumbnails = async () => {
    setRegeneratingThumbs(true);
    try {
      const response = await axios.post(`${backendUrl}/api/admin/content/regenerate-all-thumbnails`, {}, { headers: { Authorization: `Bearer ${token}` } });
      showToast('success', language === 'it' ? `${response.data.updated} anteprime rigenerate su ${response.data.total} contenuti` : `${response.data.updated} thumbnails regenerated out of ${response.data.total} items`);
      // Refresh content list
      const res = await axios.get(`${backendUrl}/api/admin/content`, { headers: { Authorization: `Bearer ${token}` } });
      setContents(res.data);
    } catch {
      showToast('error', 'Errore');
    } finally {
      setRegeneratingThumbs(false);
    }
  };

  // ===================== CONTENT HANDLERS =====================
  const handleCreateContent = async () => {
    setSubmitting(true);
    try {
      // If content type is embed, set URL to placeholder and ensure hide_origin is true
      const contentData = { ...formData };
      if (contentData.content_type === 'embed') {
        contentData.url = contentData.url || 'embed://content';
        contentData.hide_origin = true;
      }
      
      const response = await axios.post(
        `${backendUrl}/api/admin/content`,
        contentData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setContents([...contents, response.data]);
      setShowModal(null);
      setFormData({});
      showToast('success', language === 'it' ? 'Contenuto creato con successo' : 'Content created successfully');
    } catch (error) {
      showToast('error', error.response?.data?.detail || (language === 'it' ? 'Errore nella creazione' : 'Creation error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateContent = async () => {
    setSubmitting(true);
    try {
      // If content type is embed, ensure hide_origin is true
      const contentData = { ...formData };
      if (contentData.content_type === 'embed') {
        contentData.hide_origin = true;
      }
      
      await axios.put(
        `${backendUrl}/api/admin/content/${editItem.id}`,
        contentData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setContents(contents.map(c => c.id === editItem.id ? { ...c, ...contentData } : c));
      setShowModal(null);
      setEditItem(null);
      setFormData({});
      showToast('success', language === 'it' ? 'Contenuto aggiornato' : 'Content updated');
    } catch (error) {
      showToast('error', error.response?.data?.detail || (language === 'it' ? 'Errore nell\'aggiornamento' : 'Update error'));
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

  const handleUpdateUser = async () => {
    setSubmitting(true);
    try {
      const response = await axios.put(
        `${backendUrl}/api/admin/users/${editItem.id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers(users.map(u => u.id === editItem.id ? response.data : u));
      setShowModal(null);
      setEditItem(null);
      setFormData({});
      showToast('success', language === 'it' ? 'Utente aggiornato' : 'User updated');
    } catch (error) {
      showToast('error', error.response?.data?.detail || 'Errore');
    } finally {
      setSubmitting(false);
    }
  };

  // ===================== MESSAGING HANDLERS =====================
  const fetchConversations = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/admin/messages/conversations`, { headers: { Authorization: `Bearer ${token}` } });
      setConversations(res.data || []);
    } catch {}
  };

  const openChat = async (userId) => {
    const user = users.find(u => u.id === userId);
    setChatUser(user || { id: userId, full_name: 'Utente', username: 'user' });
    try {
      const res = await axios.get(`${backendUrl}/api/admin/messages/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      setChatMessages(res.data || []);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {}
  };

  const handleSendMessage = async () => {
    if (!chatUser || (!newMessage.trim() && !msgMediaUrl && !msgTaskDesc)) return;
    try {
      // Only attach content_html when we have actual rich formatting (not just a plain paragraph).
      const richHtml = newMessageHtml || '';
      const hasFormatting = /<(strong|em|u|a|ul|ol|li|h3|h4|br)\b/i.test(richHtml) || /<p>[^<]*<\/p>\s*<p>/i.test(richHtml);
      const cleanHtml = hasFormatting ? sanitizeRichHtml(richHtml) : '';

      const payload = {
        recipient_id: chatUser.id,
        content: newMessage,
        content_html: cleanHtml,
        message_type: msgType,
        media_url: msgMediaUrl,
        task_description: msgTaskDesc,
        task_due_date: msgTaskDue,
        file_name: msgFileName,
      };
      const res = await axios.post(`${backendUrl}/api/admin/messages`, payload, { headers: { Authorization: `Bearer ${token}` } });
      setChatMessages(prev => [...prev, res.data]);
      setNewMessage('');
      setNewMessageHtml('');
      setMsgMediaUrl('');
      setMsgTaskDesc('');
      setMsgTaskDue('');
      setMsgFileName('');
      setMsgType('text');
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      fetchConversations();
    } catch (error) {
      showToast('error', 'Errore invio messaggio');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm(language === 'it' ? 'Eliminare questo messaggio?' : 'Delete this message?')) return;
    try {
      await axios.delete(`${backendUrl}/api/admin/messages/${messageId}`, { headers: { Authorization: `Bearer ${token}` } });
      setChatMessages(prev => prev.filter(m => m.id !== messageId));
      showToast('success', language === 'it' ? 'Messaggio eliminato' : 'Message deleted');
      fetchConversations();
    } catch {
      showToast('error', language === 'it' ? 'Errore eliminazione' : 'Delete error');
    }
  };

  // ===================== LEAD INBOX HANDLERS =====================
  const fetchLeads = async () => {
    setLeadsLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(leadFilters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await axios.get(`${backendUrl}/api/admin/leads?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      setLeads(res.data?.items || []);
    } catch {
      showToast('error', language === 'it' ? 'Errore caricamento lead' : 'Failed to load leads');
    } finally {
      setLeadsLoading(false);
    }
  };

  const updateLead = async (leadId, patch) => {
    try {
      const res = await axios.patch(`${backendUrl}/api/admin/leads/${leadId}`, patch, { headers: { Authorization: `Bearer ${token}` } });
      setLeads(prev => prev.map(l => l.id === leadId ? res.data : l));
      if (selectedLead?.id === leadId) setSelectedLead(res.data);
      showToast('success', language === 'it' ? 'Lead aggiornato' : 'Lead updated');
    } catch {
      showToast('error', language === 'it' ? 'Errore aggiornamento' : 'Update error');
    }
  };

  // Helper to detect YouTube URL and extract video ID
  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
      /youtube\.com\/shorts\/([^"&?\/\s]{11})/i
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
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

  // ===================== YOUTUBE HANDLERS =====================
  const handleImportYoutubePlaylist = async () => {
    if (!formData.playlist_url) {
      showToast('error', language === 'it' ? 'Inserisci l\'URL della playlist YouTube' : 'Enter the YouTube playlist URL');
      return;
    }
    
    setYoutubeImporting(true);
    try {
      const response = await axios.post(
        `${backendUrl}/api/admin/youtube/import`,
        {
          playlist_url: formData.playlist_url,
          assigned_users: formData.assigned_users || [],
          is_public: formData.is_public || false
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh data
      const [playlistsRes, foldersRes, contentRes] = await Promise.all([
        axios.get(`${backendUrl}/api/admin/youtube/playlists`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${backendUrl}/api/admin/folders`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${backendUrl}/api/admin/content`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setYoutubePlaylists(playlistsRes.data);
      setFolders(foldersRes.data);
      setContents(contentRes.data);
      setShowModal(null);
      setFormData({});
      showToast('success', `${t.playlistImported}: "${response.data.folder_name}" - ${response.data.video_count} ${t.videos}!`);
    } catch (error) {
      showToast('error', error.response?.data?.detail || t.errorLoading);
    } finally {
      setYoutubeImporting(false);
    }
  };

  const handleSyncPlaylist = async (playlistId) => {
    setYoutubeSyncing(playlistId);
    try {
      const response = await axios.post(
        `${backendUrl}/api/admin/youtube/sync/${playlistId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh playlists and content
      const [playlistsRes, contentRes] = await Promise.all([
        axios.get(`${backendUrl}/api/admin/youtube/playlists`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${backendUrl}/api/admin/content`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setYoutubePlaylists(playlistsRes.data);
      setContents(contentRes.data);
      
      if (response.data.new_videos_added > 0) {
        showToast('success', `${t.syncComplete}: ${response.data.new_videos_added} ${t.newVideosAdded}`);
      } else {
        showToast('success', t.noNewVideos);
      }
    } catch (error) {
      showToast('error', error.response?.data?.detail || t.errorLoading);
    } finally {
      setYoutubeSyncing(null);
    }
  };

  const handleSyncAllPlaylists = async () => {
    setYoutubeSyncing('all');
    try {
      const response = await axios.post(
        `${backendUrl}/api/admin/youtube/sync-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh data
      const [playlistsRes, contentRes] = await Promise.all([
        axios.get(`${backendUrl}/api/admin/youtube/playlists`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${backendUrl}/api/admin/content`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setYoutubePlaylists(playlistsRes.data);
      setContents(contentRes.data);
      showToast('success', response.data.message);
    } catch (error) {
      showToast('error', error.response?.data?.detail || t.errorLoading);
    } finally {
      setYoutubeSyncing(null);
    }
  };

  const handleDeleteYoutubePlaylist = async (playlistId, deleteContent) => {
    const confirmMsg = deleteContent 
      ? t.deletePlaylistContent
      : t.deletePlaylistOnly;
    
    if (!window.confirm(confirmMsg)) return;
    
    try {
      await axios.delete(
        `${backendUrl}/api/admin/youtube/playlist/${playlistId}?delete_content=${deleteContent}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh data
      const [playlistsRes, foldersRes, contentRes] = await Promise.all([
        axios.get(`${backendUrl}/api/admin/youtube/playlists`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${backendUrl}/api/admin/folders`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${backendUrl}/api/admin/content`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setYoutubePlaylists(playlistsRes.data);
      setFolders(foldersRes.data);
      setContents(contentRes.data);
      showToast('success', 'Playlist eliminata');
    } catch (error) {
      showToast('error', error.response?.data?.detail || 'Errore nell\'eliminazione');
    }
  };

  const handleUpdatePlaylistUsers = async (playlistId) => {
    setSubmitting(true);
    try {
      await axios.put(
        `${backendUrl}/api/admin/youtube/playlist/${playlistId}/users`,
        { user_ids: formData.assigned_users || [] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh data
      const [playlistsRes, foldersRes, contentRes] = await Promise.all([
        axios.get(`${backendUrl}/api/admin/youtube/playlists`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${backendUrl}/api/admin/folders`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${backendUrl}/api/admin/content`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setYoutubePlaylists(playlistsRes.data);
      setFolders(foldersRes.data);
      setContents(contentRes.data);
      setShowModal(null);
      setEditItem(null);
      setFormData({});
      showToast('success', 'Utenti aggiornati per tutti i video della playlist');
    } catch (error) {
      showToast('error', error.response?.data?.detail || 'Errore nell\'aggiornamento');
    } finally {
      setSubmitting(false);
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

  // ===================== POPUP MESSAGE HANDLERS =====================
  const refreshPopupStats = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/admin/popups/stats`, { headers: { Authorization: `Bearer ${token}` } });
      setPopupStats(res.data || {});
    } catch {}
  };

  const handlePopupMediaUpload = async (file) => {
    if (!file) return;
    setPopupMediaUploading(true);
    setPopupMediaProgress(0);
    
    const uploadData = new FormData();
    uploadData.append('file', file);
    
    try {
      const response = await axios.post(
        `${backendUrl}/api/admin/popups/upload-media`,
        uploadData,
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => setPopupMediaProgress(Math.round((e.loaded * 100) / e.total))
        }
      );
      setFormData(prev => ({
        ...prev,
        media_url: `${backendUrl}${response.data.url}`,
        message_type: response.data.file_type,
        thumbnail_url: response.data.thumbnail_url 
          ? (response.data.thumbnail_url.startsWith('http') ? response.data.thumbnail_url : `${backendUrl}${response.data.thumbnail_url}`)
          : prev.thumbnail_url || ''
      }));
      showToast('success', `File "${response.data.original_filename}" caricato!`);
    } catch (error) {
      showToast('error', error.response?.data?.detail || 'Errore nel caricamento');
    } finally {
      setPopupMediaUploading(false);
      setPopupMediaProgress(0);
    }
  };

  const handleCreatePopup = async () => {
    setSubmitting(true);
    try {
      const response = await axios.post(
        `${backendUrl}/api/admin/popups`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPopupMessages([response.data, ...popupMessages]);
      setShowModal(null);
      setFormData({});
      showToast('success', t.popupCreated);
      refreshPopupStats();
    } catch (error) {
      showToast('error', error.response?.data?.detail || 'Errore');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePopup = async () => {
    setSubmitting(true);
    try {
      const response = await axios.put(
        `${backendUrl}/api/admin/popups/${editItem.id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPopupMessages(popupMessages.map(p => p.id === editItem.id ? response.data : p));
      setShowModal(null);
      setEditItem(null);
      setFormData({});
      showToast('success', t.popupUpdated);
    } catch (error) {
      showToast('error', error.response?.data?.detail || 'Errore');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePopup = async (id) => {
    if (!window.confirm(t.popupConfirmDelete)) return;
    try {
      await axios.delete(`${backendUrl}/api/admin/popups/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setPopupMessages(popupMessages.filter(p => p.id !== id));
      showToast('success', t.popupDeleted);
    } catch (error) {
      showToast('error', 'Errore nell\'eliminazione');
    }
  };

  const handleTogglePopupActive = async (popup) => {
    try {
      const response = await axios.put(
        `${backendUrl}/api/admin/popups/${popup.id}`,
        { is_active: !popup.is_active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPopupMessages(popupMessages.map(p => p.id === popup.id ? response.data : p));
      showToast('success', response.data.is_active ? t.popupActive : t.popupInactive);
    } catch (error) {
      showToast('error', 'Errore');
    }
  };

  return {
    // Context / router
    navigate, user, token, isAdmin, authLoading, language, t, backendUrl,
    // State
    activeTab, contents, folders, users, loading, showModal, editItem, formData,
    submitting, message, uploadProgress, isUploading, storageStats, databaseStats,
    leads, leadsLoading, leadFilters, selectedLead,
    youtubePlaylists, youtubeImporting, youtubeSyncing,
    popupMessages, popupStats, popupMediaUploading, popupMediaProgress,
    conversations, chatMessages, chatUser, newMessage, newMessageHtml,
    showEmailPreview, msgType, msgMediaUrl, msgTaskDesc, msgTaskDue, msgFileName,
    thumbnailUploading, regeneratingThumbs, regeneratingThumbId,
    crmSections,
    // Setters
    setActiveTab, setContents, setFolders, setUsers, setLoading, setShowModal,
    setEditItem, setFormData, setSubmitting, setMessage, setUploadProgress,
    setIsUploading, setStorageStats, setDatabaseStats, setLeads, setLeadsLoading,
    setLeadFilters, setSelectedLead, setYoutubePlaylists, setYoutubeImporting,
    setYoutubeSyncing, setPopupMessages, setPopupStats, setPopupMediaUploading,
    setPopupMediaProgress, setConversations, setChatMessages, setChatUser,
    setNewMessage, setNewMessageHtml, setShowEmailPreview, setMsgType,
    setMsgMediaUrl, setMsgTaskDesc, setMsgTaskDue, setMsgFileName,
    setThumbnailUploading, setRegeneratingThumbs, setRegeneratingThumbId,
    setCrmSections,
    // Refs
    chatEndRef, popupFileInputRef, thumbnailFileInputRef, fileInputRef,
    // Derived
    clientUsers,
    // Helpers
    showToast, toggleCrmSection, autoGenerateThumbnailFromUrl,
    toggleUserSelection, getUserName, getYouTubeVideoId, getContentIcon,
    refreshPopupStats,
    // Handlers - Folders
    handleCreateFolder, handleUpdateFolder, handleDeleteFolder,
    // Handlers - Content
    handleFileUpload, handleCustomThumbnailUpload, handleRegenerateThumbnail,
    handleRegenerateAllThumbnails, handleCreateContent, handleUpdateContent,
    handleDeleteContent,
    // Handlers - Users
    handleCreateUser, handleUpdateUser, handleDeleteUser,
    // Handlers - Messaging
    fetchConversations, openChat, handleSendMessage, handleDeleteMessage,
    // Handlers - Leads
    fetchLeads, updateLead,
    // Handlers - YouTube
    handleImportYoutubePlaylist, handleSyncPlaylist, handleSyncAllPlaylists,
    handleDeleteYoutubePlaylist, handleUpdatePlaylistUsers,
    // Handlers - Popup
    handlePopupMediaUpload, handleCreatePopup, handleUpdatePopup,
    handleDeletePopup, handleTogglePopupActive,
  };
};

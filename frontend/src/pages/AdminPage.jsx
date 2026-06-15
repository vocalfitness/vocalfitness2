import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Users, FolderOpen, Plus, Trash2, Edit,
  Loader2, Video, FileText, Music, Link as LinkIcon,
  Save, X, Upload, CheckCircle, AlertCircle, HardDrive,
  Folder, Eye, EyeOff, UserCheck, Youtube, RefreshCw, ExternalLink,
  MessageSquare, Bell, Power, PowerOff, Send, Building2, User,
  ClipboardList, Calendar, ChevronDown, ChevronUp, UserPlus, Briefcase, Inbox, Search, Filter, Mail, AudioLines
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { RichTextEditor, sanitizeRichHtml } from '../components/RichTextEditor';
import { EmailPreviewModal } from '../components/EmailPreviewModal';
import { ElevenLabsStudio } from '../components/ElevenLabsStudio';
import { BACKEND_URL } from '../lib/backend';

// Translations for Admin Page
const translations = {
  it: {
    // Header
    backToSite: "Torna al sito",
    adminPanel: "Pannello Admin",
    welcome: "Benvenuto",
    storage: "Storage",
    
    // Tabs
    folders: "Cartelle",
    content: "Contenuti",
    youtube: "YouTube",
    users: "Utenti",
    database: "Database",
    
    // Actions
    newFolder: "Nuova Cartella",
    newContent: "Nuovo Contenuto",
    uploadFile: "Carica File",
    newUser: "Nuovo Utente",
    importPlaylist: "Importa Playlist",
    syncAll: "Sincronizza Tutte",
    save: "Salva",
    cancel: "Annulla",
    delete: "Elimina",
    edit: "Modifica",
    watch: "Guarda",
    download: "Scarica",
    import: "Importa",
    
    // Folder form
    folderName: "Nome Cartella",
    folderDescription: "Descrizione",
    folderThumbnail: "URL Thumbnail (opzionale)",
    publicFolder: "Cartella Pubblica",
    publicFolderDesc: "Visibile a tutti i clienti",
    assignToClients: "Assegna a clienti specifici",
    
    // Content form
    contentTitle: "Titolo",
    contentDescription: "Descrizione",
    contentType: "Tipo Contenuto",
    contentUrl: "URL Contenuto",
    selectFolder: "Seleziona cartella",
    noFolder: "Nessuna cartella",
    publicContent: "Contenuto Pubblico",
    hideOrigin: "Nascondi origine",
    hideOriginDesc: "I clienti non vedranno da dove proviene il contenuto",
    embedCode: "Codice Embed (opzionale)",
    embedCodePlaceholder: "Incolla qui il codice embed <iframe>...",
    
    // User form
    username: "Username",
    email: "Email",
    password: "Password",
    fullName: "Nome Completo",
    role: "Ruolo",
    client: "Cliente",
    admin: "Admin",
    
    // YouTube
    youtubeImport: "Importazione Playlist YouTube",
    youtubeHowItWorks: "Come funziona",
    youtubeStep1: "Incolla l'URL di una playlist YouTube pubblica o non in elenco",
    youtubeStep2: "Viene creata automaticamente una cartella con il nome della playlist",
    youtubeStep3: "Tutti i video vengono importati come contenuti nell'area clienti",
    youtubeStep4: "Puoi assegnare la playlist a clienti specifici",
    youtubeStep5: "La sincronizzazione giornaliera aggiunge automaticamente nuovi video",
    noPlaylistsYet: "Nessuna playlist importata. Importa la prima!",
    playlistUrl: "URL Playlist YouTube",
    playlistUrlPlaceholder: "https://www.youtube.com/playlist?list=...",
    publicPlaylist: "Pubblica (visibile a tutti i clienti)",
    lastSync: "Ultima sync",
    openOnYoutube: "Apri su YouTube",
    videos: "video",
    reserved: "Riservata",
    public: "Pubblica",
    
    // Database
    databaseStats: "Statistiche Database",
    collection: "Collezione",
    documents: "Documenti",
    indexes: "Indici",
    totalSize: "Dimensione Totale",
    
    // Messages
    loading: "Caricamento...",
    errorLoading: "Errore nel caricamento dei dati",
    noFolders: "Nessuna cartella creata",
    noContent: "Nessun contenuto",
    noUsers: "Nessun utente",
    confirmDelete: "Sei sicuro di voler eliminare?",
    deletePlaylistContent: "Eliminare la playlist E tutti i contenuti associati?",
    deletePlaylistOnly: "Eliminare solo il tracciamento della playlist? (cartella e video rimarranno)",
    playlistDeleted: "Playlist eliminata",
    usersUpdated: "Utenti aggiornati per tutti i video della playlist",
    syncComplete: "Sincronizzazione completata",
    newVideosAdded: "nuovi video aggiunti",
    noNewVideos: "Nessun nuovo video trovato",
    playlistImported: "Playlist importata con successo",
    
    // Modal titles
    modalNewFolder: "Nuova Cartella",
    modalEditFolder: "Modifica Cartella",
    modalNewContent: "Nuovo Contenuto",
    modalEditContent: "Modifica Contenuto",
    modalNewUser: "Nuovo Utente",
    modalImportYoutube: "Importa Playlist YouTube",
    modalEditPlaylistUsers: "Modifica Utenti Playlist",
    
    // Content types
    video: "Video",
    audio: "Audio",
    pdf: "PDF",
    link: "Link",
    
    // Misc
    noClientsAvailable: "Nessun cliente disponibile. Crea prima un utente cliente.",
    selectClients: "Seleziona clienti",
    assignedUsers: "utenti",
    
    // Popup Messages
    popupMessages: "Messaggi Pop-up",
    newPopup: "Nuovo Messaggio",
    popupTitle: "Titolo Messaggio",
    popupContent: "Contenuto Messaggio",
    popupType: "Tipo Messaggio",
    popupTypeText: "Testo",
    popupTypeAudio: "Audio",
    popupTypeVideo: "Video",
    popupTarget: "Destinatari",
    popupTargetAll: "Tutti i clienti",
    popupTargetSpecific: "Clienti specifici",
    popupActive: "Attivo",
    popupInactive: "Disattivato",
    popupMediaUrl: "URL Media (link esterno)",
    popupMediaUrlPlaceholder: "https://youtube.com/... o link audio/video",
    popupUploadMedia: "Carica File Media",
    popupButtonText: "Testo Pulsante CTA (opzionale)",
    popupButtonUrl: "URL Pulsante CTA (opzionale)",
    popupNoMessages: "Nessun messaggio pop-up creato",
    popupCreated: "Messaggio pop-up creato",
    popupUpdated: "Messaggio pop-up aggiornato",
    popupDeleted: "Messaggio pop-up eliminato",
    popupConfirmDelete: "Sei sicuro di voler eliminare questo messaggio?",
    popupEmbedCode: "Codice Embed (opzionale)",
    popupEmbedPlaceholder: "Incolla codice embed <iframe>...",
    popupMediaOption: "Opzione Media",
    popupMediaUpload: "Carica file",
    popupMediaLink: "Link esterno",
    popupAllClients: "Tutti i clienti",
    popupViews: "Visualizzazioni",
    popupDismissals: "Dismiss"
  },
  en: {
    // Header
    backToSite: "Back to site",
    adminPanel: "Admin Panel",
    welcome: "Welcome",
    storage: "Storage",
    
    // Tabs
    folders: "Folders",
    content: "Content",
    youtube: "YouTube",
    users: "Users",
    database: "Database",
    
    // Actions
    newFolder: "New Folder",
    newContent: "New Content",
    uploadFile: "Upload File",
    newUser: "New User",
    importPlaylist: "Import Playlist",
    syncAll: "Sync All",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    watch: "Watch",
    download: "Download",
    import: "Import",
    
    // Folder form
    folderName: "Folder Name",
    folderDescription: "Description",
    folderThumbnail: "Thumbnail URL (optional)",
    publicFolder: "Public Folder",
    publicFolderDesc: "Visible to all clients",
    assignToClients: "Assign to specific clients",
    
    // Content form
    contentTitle: "Title",
    contentDescription: "Description",
    contentType: "Content Type",
    contentUrl: "Content URL",
    selectFolder: "Select folder",
    noFolder: "No folder",
    publicContent: "Public Content",
    hideOrigin: "Hide origin",
    hideOriginDesc: "Clients won't see where the content comes from",
    embedCode: "Embed Code (optional)",
    embedCodePlaceholder: "Paste the embed code <iframe>... here",
    
    // User form
    username: "Username",
    email: "Email",
    password: "Password",
    fullName: "Full Name",
    role: "Role",
    client: "Client",
    admin: "Admin",
    
    // YouTube
    youtubeImport: "YouTube Playlist Import",
    youtubeHowItWorks: "How it works",
    youtubeStep1: "Paste the URL of a public or unlisted YouTube playlist",
    youtubeStep2: "A folder is automatically created with the playlist name",
    youtubeStep3: "All videos are imported as content in the client area",
    youtubeStep4: "You can assign the playlist to specific clients",
    youtubeStep5: "Daily sync automatically adds new videos",
    noPlaylistsYet: "No playlists imported yet. Import your first one!",
    playlistUrl: "YouTube Playlist URL",
    playlistUrlPlaceholder: "https://www.youtube.com/playlist?list=...",
    publicPlaylist: "Public (visible to all clients)",
    lastSync: "Last sync",
    openOnYoutube: "Open on YouTube",
    videos: "videos",
    reserved: "Reserved",
    public: "Public",
    
    // Database
    databaseStats: "Database Statistics",
    collection: "Collection",
    documents: "Documents",
    indexes: "Indexes",
    totalSize: "Total Size",
    
    // Messages
    loading: "Loading...",
    errorLoading: "Error loading data",
    noFolders: "No folders created",
    noContent: "No content",
    noUsers: "No users",
    confirmDelete: "Are you sure you want to delete?",
    deletePlaylistContent: "Delete the playlist AND all associated content?",
    deletePlaylistOnly: "Delete only playlist tracking? (folder and videos will remain)",
    playlistDeleted: "Playlist deleted",
    usersUpdated: "Users updated for all playlist videos",
    syncComplete: "Sync complete",
    newVideosAdded: "new videos added",
    noNewVideos: "No new videos found",
    playlistImported: "Playlist imported successfully",
    
    // Modal titles
    modalNewFolder: "New Folder",
    modalEditFolder: "Edit Folder",
    modalNewContent: "New Content",
    modalEditContent: "Edit Content",
    modalNewUser: "New User",
    modalImportYoutube: "Import YouTube Playlist",
    modalEditPlaylistUsers: "Edit Playlist Users",
    
    // Content types
    video: "Video",
    audio: "Audio",
    pdf: "PDF",
    link: "Link",
    
    // Misc
    noClientsAvailable: "No clients available. Create a client user first.",
    selectClients: "Select clients",
    assignedUsers: "users",
    
    // Popup Messages
    popupMessages: "Pop-up Messages",
    newPopup: "New Message",
    popupTitle: "Message Title",
    popupContent: "Message Content",
    popupType: "Message Type",
    popupTypeText: "Text",
    popupTypeAudio: "Audio",
    popupTypeVideo: "Video",
    popupTarget: "Recipients",
    popupTargetAll: "All clients",
    popupTargetSpecific: "Specific clients",
    popupActive: "Active",
    popupInactive: "Disabled",
    popupMediaUrl: "Media URL (external link)",
    popupMediaUrlPlaceholder: "https://youtube.com/... or audio/video link",
    popupUploadMedia: "Upload Media File",
    popupButtonText: "CTA Button Text (optional)",
    popupButtonUrl: "CTA Button URL (optional)",
    popupNoMessages: "No pop-up messages created",
    popupCreated: "Pop-up message created",
    popupUpdated: "Pop-up message updated",
    popupDeleted: "Pop-up message deleted",
    popupConfirmDelete: "Are you sure you want to delete this message?",
    popupEmbedCode: "Embed Code (optional)",
    popupEmbedPlaceholder: "Paste embed code <iframe>...",
    popupMediaOption: "Media Option",
    popupMediaUpload: "Upload file",
    popupMediaLink: "External link",
    popupAllClients: "All clients",
    popupViews: "Views",
    popupDismissals: "Dismissed"
  }
};

const AdminPage = () => {
  const navigate = useNavigate();
  const { user, token, isAdmin, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const t = translations[language] || translations.en;
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
            <h1 className="text-xl font-bold text-white">{t.adminPanel}</h1>
          </div>
          <p className="text-blue-300 text-sm">{language === 'it' ? 'Gestione Area Riservata' : 'Reserved Area Management'}</p>
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
            <Folder className="w-4 h-4 mr-2" /> {t.folders} ({folders.length})
          </Button>
          <Button onClick={() => setActiveTab('content')} className={activeTab === 'content' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'} data-testid="tab-content">
            <FolderOpen className="w-4 h-4 mr-2" /> {t.content} ({contents.length})
          </Button>
          <Button onClick={() => setActiveTab('youtube')} className={activeTab === 'youtube' ? 'bg-red-600' : 'bg-slate-700 hover:bg-slate-600'} data-testid="tab-youtube">
            <Youtube className="w-4 h-4 mr-2" /> {t.youtube} ({youtubePlaylists.length})
          </Button>
          <Button onClick={() => setActiveTab('users')} className={activeTab === 'users' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'} data-testid="tab-users">
            <Users className="w-4 h-4 mr-2" /> {t.users} ({users.length})
          </Button>
          <Button onClick={() => setActiveTab('database')} className={activeTab === 'database' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'} data-testid="tab-database">
            <HardDrive className="w-4 h-4 mr-2" /> {t.database}
          </Button>
          <Button onClick={() => setActiveTab('popups')} className={activeTab === 'popups' ? 'bg-amber-600' : 'bg-slate-700 hover:bg-slate-600'} data-testid="tab-popups">
            <MessageSquare className="w-4 h-4 mr-2" /> {t.popupMessages} ({popupMessages.length})
          </Button>
          <Button onClick={() => { setActiveTab('messaging'); fetchConversations(); }} className={activeTab === 'messaging' ? 'bg-emerald-600' : 'bg-slate-700 hover:bg-slate-600'} data-testid="tab-messaging">
            <Send className="w-4 h-4 mr-2" /> {language === 'it' ? 'Messaggi' : 'Messages'}
          </Button>
          <Button onClick={() => { setActiveTab('leads'); fetchLeads(); }} className={activeTab === 'leads' ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'} data-testid="tab-leads">
            <Inbox className="w-4 h-4 mr-2" /> {language === 'it' ? 'Lead Inbox' : 'Lead Inbox'}{leads.length ? ` (${leads.length})` : ''}
          </Button>
          <Button onClick={() => setActiveTab('audio-studio')} className={activeTab === 'audio-studio' ? 'bg-amber-600' : 'bg-slate-700 hover:bg-slate-600'} data-testid="tab-audio-studio">
            <AudioLines className="w-4 h-4 mr-2" /> Audio Studio
          </Button>
        </div>

        {/* Storage Stats */}
        {storageStats && (
          <div className="mb-6 bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-slate-300">
                <HardDrive className="w-5 h-5 text-blue-400" />
                <span className="font-medium">{t.storage}</span>
              </div>
              <span className="text-sm text-slate-400">{storageStats.file_count} file • Max {storageStats.max_file_size_formatted}/file</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3 mb-2">
              <div className={`h-3 rounded-full transition-all ${storageStats.usage_percentage > 90 ? 'bg-red-500' : storageStats.usage_percentage > 70 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(storageStats.usage_percentage, 100)}%` }} />
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>{language === 'it' ? 'Usato' : 'Used'}: {storageStats.total_used_formatted}</span>
              <span>{storageStats.usage_percentage}%</span>
              <span>{language === 'it' ? 'Disponibile' : 'Available'}: {storageStats.remaining_formatted}</span>
            </div>
          </div>
        )}

        {/* ===================== FOLDERS TAB ===================== */}
        {activeTab === 'folders' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-white">{language === 'it' ? 'Gestione Cartelle' : 'Folder Management'}</h2>
              <Button onClick={() => { setFormData({ is_public: true, assigned_users: [], order: 0 }); setShowModal('create-folder'); }} className="bg-green-600 hover:bg-green-700" data-testid="add-folder-button">
                <Plus className="w-4 h-4 mr-2" /> {t.newFolder}
              </Button>
            </div>

            {folders.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/50 rounded-xl">
                <Folder className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">{t.noFolders}</p>
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
              <div className="flex gap-2">
                <Button onClick={handleRegenerateAllThumbnails} disabled={regeneratingThumbs} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700" data-testid="regenerate-all-thumbnails">
                  {regeneratingThumbs ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  {language === 'it' ? 'Rigenera anteprime' : 'Regenerate thumbnails'}
                </Button>
                <Button onClick={() => { setFormData({ content_type: 'video', is_public: true, assigned_users: [], order: 0 }); setShowModal('create-content'); }} className="bg-green-600 hover:bg-green-700" data-testid="add-content-button">
                  <Plus className="w-4 h-4 mr-2" /> Aggiungi Contenuto
                </Button>
              </div>
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
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-300 w-16"></th>
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
                        <td className="px-4 py-2">
                          <div className="w-12 h-8 rounded overflow-hidden bg-slate-700 flex items-center justify-center">
                            {content.thumbnail_url ? (
                              <img src={content.thumbnail_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              getContentIcon(content.content_type)
                            )}
                          </div>
                        </td>
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
                          <div className="flex gap-1 justify-end">
                            <Button onClick={() => handleRegenerateThumbnail(content.id)} variant="ghost" size="sm" className="text-emerald-400 hover:bg-emerald-500/20" disabled={regeneratingThumbId === content.id} data-testid={`regen-thumb-${content.id}`} title={language === 'it' ? 'Rigenera anteprima' : 'Regenerate thumbnail'}>
                              {regeneratingThumbId === content.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            </Button>
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
              <h2 className="text-lg font-semibold text-white">{language === 'it' ? 'Gestione Utenti' : 'User Management'}</h2>
              <Button onClick={() => { setFormData({ role: 'client' }); setShowModal('create-user'); }} className="bg-green-600 hover:bg-green-700" data-testid="add-user-button">
                <Plus className="w-4 h-4 mr-2" /> {t.newUser}
              </Button>
            </div>

            <div className="bg-slate-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">{t.username}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">{language === 'it' ? 'Nome' : 'Name'}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">{t.email}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">{t.role}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">{language === 'it' ? 'Tipo' : 'Type'}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-slate-300">{language === 'it' ? 'Azioni' : 'Actions'}</th>
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
                          u.role === 'admin' ? 'bg-red-500/20 text-red-300' : 
                          u.role === 'manager' ? 'bg-orange-500/20 text-orange-300' :
                          u.role === 'editor' ? 'bg-purple-500/20 text-purple-300' :
                          u.role === 'collaborator' ? 'bg-cyan-500/20 text-cyan-300' :
                          u.role === 'lead' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-blue-500/20 text-blue-300'
                        }`}>
                          {u.role === 'admin' ? '🔐 Admin' : 
                           u.role === 'manager' ? '📊 Manager' :
                           u.role === 'editor' ? '✏️ Editor' :
                           u.role === 'collaborator' ? (language === 'it' ? '🤝 Collaboratore' : '🤝 Collaborator') :
                           u.role === 'lead' ? '📝 Lead' :
                           (language === 'it' ? '👤 Cliente' : '👤 Client')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-400">{u.client_type === 'business' ? '🏢' : u.client_type === 'foreign' ? '🌍' : '👤'} {u.client_type === 'business' ? (language === 'it' ? 'Business' : 'Business') : u.client_type === 'foreign' ? (language === 'it' ? 'Estero' : 'Foreign') : (language === 'it' ? 'Privato' : 'Private')}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          {!['admin', 'manager', 'editor'].includes(u.role) && (
                            <Button onClick={() => { openChat(u.id); setActiveTab('messaging'); fetchConversations(); }} variant="ghost" size="sm" className="text-emerald-400 hover:bg-emerald-500/20" title={language === 'it' ? 'Messaggi' : 'Messages'}>
                              <Send className="w-4 h-4" />
                            </Button>
                          )}
                          <Button onClick={() => { setEditItem(u); setFormData({...u}); setShowModal('edit-user'); }} variant="ghost" size="sm" className="text-blue-400 hover:bg-blue-500/20" data-testid={`edit-user-${u.id}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          {u.username !== 'admin' && (
                            <Button onClick={() => handleDeleteUser(u.id)} variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/20">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== YOUTUBE TAB ===================== */}
        {activeTab === 'youtube' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-white">{t.youtubeImport}</h2>
              <div className="flex gap-2">
                {youtubePlaylists.length > 0 && (
                  <Button 
                    onClick={handleSyncAllPlaylists} 
                    disabled={youtubeSyncing === 'all'}
                    className="bg-amber-600 hover:bg-amber-700"
                    data-testid="sync-all-playlists"
                  >
                    {youtubeSyncing === 'all' ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    {t.syncAll}
                  </Button>
                )}
                <Button 
                  onClick={() => { setFormData({ is_public: false, assigned_users: [] }); setShowModal('import-youtube'); }} 
                  className="bg-red-600 hover:bg-red-700"
                  data-testid="import-youtube-button"
                >
                  <Plus className="w-4 h-4 mr-2" /> {t.importPlaylist}
                </Button>
              </div>
            </div>

            {/* Info Box */}
            <div className="mb-6 bg-blue-900/30 rounded-xl p-4 border border-blue-700/50">
              <div className="flex items-start gap-3">
                <Youtube className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-medium mb-1">{t.youtubeHowItWorks}</h3>
                  <ul className="text-sm text-slate-300 space-y-1">
                    <li>• {t.youtubeStep1}</li>
                    <li>• {t.youtubeStep2}</li>
                    <li>• {t.youtubeStep3}</li>
                    <li>• {t.youtubeStep4}</li>
                    <li>• {t.youtubeStep5}</li>
                  </ul>
                </div>
              </div>
            </div>

            {youtubePlaylists.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/50 rounded-xl">
                <Youtube className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-slate-400">{t.noPlaylistsYet}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {youtubePlaylists.map(playlist => (
                  <div key={playlist.id} className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-red-500/50 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-red-600/20 rounded-lg flex items-center justify-center">
                          <Youtube className="w-6 h-6 text-red-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{playlist.playlist_title || playlist.folder_name}</h3>
                          <p className="text-sm text-slate-400">{playlist.current_video_count || playlist.video_count} {t.videos}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          onClick={() => handleSyncPlaylist(playlist.id)} 
                          disabled={youtubeSyncing === playlist.id}
                          variant="ghost" 
                          size="sm" 
                          className="text-amber-400 hover:bg-amber-500/20"
                          title="Sincronizza"
                        >
                          {youtubeSyncing === playlist.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </Button>
                        <Button 
                          onClick={() => { setEditItem(playlist); setFormData({ assigned_users: playlist.assigned_users || [] }); setShowModal('edit-youtube-users'); }} 
                          variant="ghost" 
                          size="sm" 
                          className="text-blue-400 hover:bg-blue-500/20"
                          title={language === 'it' ? 'Modifica utenti' : 'Edit users'}
                        >
                          <UserCheck className="w-4 h-4" />
                        </Button>
                        <Button 
                          onClick={() => handleDeleteYoutubePlaylist(playlist.id, true)} 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-400 hover:bg-red-500/20"
                          title={t.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <span className={`px-2 py-1 rounded text-xs ${playlist.is_public ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'}`}>
                        {playlist.is_public ? <><Eye className="w-3 h-3 inline mr-1" /> {t.public}</> : <><EyeOff className="w-3 h-3 inline mr-1" /> {t.reserved}</>}
                      </span>
                      {playlist.assigned_users?.length > 0 && (
                        <span className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-300">
                          <UserCheck className="w-3 h-3 inline mr-1" /> {playlist.assigned_users.length} {t.assignedUsers}
                        </span>
                      )}
                      <span className="px-2 py-1 rounded text-xs bg-slate-600 text-slate-300">
                        <Folder className="w-3 h-3 inline mr-1" /> {playlist.folder_name}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{t.lastSync}: {playlist.last_sync ? new Date(playlist.last_sync).toLocaleString(language === 'it' ? 'it-IT' : 'en-US') : (language === 'it' ? 'Mai' : 'Never')}</span>
                      <a 
                        href={`https://www.youtube.com/playlist?list=${playlist.playlist_id}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-red-400 hover:text-red-300 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> {t.openOnYoutube}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===================== LEAD INBOX TAB ===================== */}
        {activeTab === 'audio-studio' && (
          <ElevenLabsStudio token={token} language={language} />
        )}

        {activeTab === 'leads' && (
          <div data-testid="leads-panel">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Inbox className="w-5 h-5 text-blue-400" />
                  {language === 'it' ? 'Lead Inbox' : 'Lead Inbox'}
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  {language === 'it' ? 'Lead qualificati dal wizard onboarding e dal form classico' : 'Qualified leads from the onboarding wizard and classic form'} · {leads.length} {language === 'it' ? 'risultati' : 'results'}
                </p>
              </div>
              <Button onClick={fetchLeads} disabled={leadsLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
                <RefreshCw className={`w-4 h-4 mr-2 ${leadsLoading ? 'animate-spin' : ''}`} />
                {language === 'it' ? 'Aggiorna' : 'Refresh'}
              </Button>
            </div>

            {/* Filters */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-slate-300 mb-3 text-sm font-semibold uppercase tracking-wider">
                <Filter className="w-4 h-4 text-blue-400" />
                {language === 'it' ? 'Filtri' : 'Filters'}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2">
                <div className="lg:col-span-2 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text" placeholder={language === 'it' ? 'Cerca nome, email...' : 'Search name, email...'}
                    value={leadFilters.search}
                    onChange={(e) => setLeadFilters(prev => ({ ...prev, search: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') fetchLeads(); }}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:border-blue-500 focus:outline-none"
                    data-testid="leads-filter-search"
                  />
                </div>
                <select
                  value={leadFilters.source}
                  onChange={(e) => { setLeadFilters(prev => ({ ...prev, source: e.target.value })); }}
                  className="px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
                  data-testid="leads-filter-source"
                >
                  <option value="">{language === 'it' ? 'Tutte le sorgenti' : 'All sources'}</option>
                  <option value="onboarding_wizard">Wizard</option>
                  <option value="booking_form">Form classico</option>
                </select>
                <select
                  value={leadFilters.englishLevel}
                  onChange={(e) => setLeadFilters(prev => ({ ...prev, englishLevel: e.target.value }))}
                  className="px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
                  data-testid="leads-filter-level"
                >
                  <option value="">CEFR</option>
                  {['A1','A2','B1','B2','C1','C2'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <select
                  value={leadFilters.role}
                  onChange={(e) => setLeadFilters(prev => ({ ...prev, role: e.target.value }))}
                  className="px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none"
                  data-testid="leads-filter-role"
                >
                  <option value="">{language === 'it' ? 'Ruolo' : 'Role'}</option>
                  {['executive','manager','professional','sales','academic','student','entrepreneur','other'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <input
                  type="text" placeholder={language === 'it' ? 'Settore' : 'Sector'}
                  value={leadFilters.sector}
                  onChange={(e) => setLeadFilters(prev => ({ ...prev, sector: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchLeads(); }}
                  className="px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:border-blue-500 focus:outline-none"
                  data-testid="leads-filter-sector"
                />
                <input
                  type="text" placeholder={language === 'it' ? 'Lingua madre' : 'Native lang.'}
                  value={leadFilters.nativeLanguage}
                  onChange={(e) => setLeadFilters(prev => ({ ...prev, nativeLanguage: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchLeads(); }}
                  className="px-3 py-2 bg-slate-900/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:border-blue-500 focus:outline-none"
                  data-testid="leads-filter-native"
                />
              </div>
              <div className="flex justify-between items-center mt-3">
                <button
                  onClick={() => { setLeadFilters({ source: '', englishLevel: '', role: '', sector: '', nativeLanguage: '', status: '', search: '' }); setTimeout(fetchLeads, 0); }}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                  data-testid="leads-filter-clear"
                >
                  {language === 'it' ? 'Pulisci filtri' : 'Clear filters'}
                </button>
                <Button onClick={fetchLeads} size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs" data-testid="leads-apply-filters">
                  {language === 'it' ? 'Applica filtri' : 'Apply filters'}
                </Button>
              </div>
            </div>

            {/* Leads list */}
            {leadsLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin mx-auto" />
              </div>
            ) : leads.length === 0 ? (
              <div className="text-center py-16 bg-slate-800/40 border border-slate-700 rounded-xl">
                <Inbox className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">{language === 'it' ? 'Nessun lead trovato' : 'No leads found'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leads.map((lead) => {
                  const isWizard = lead.source === 'onboarding_wizard';
                  const cefrColor = {
                    A1: 'bg-slate-600', A2: 'bg-slate-500',
                    B1: 'bg-blue-600', B2: 'bg-blue-500',
                    C1: 'bg-emerald-600', C2: 'bg-emerald-500'
                  }[lead.englishLevel] || 'bg-slate-700';
                  const statusColor = {
                    pending: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                    contacted: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
                    qualified: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                    closed: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
                  }[lead.status] || 'bg-slate-500/20 text-slate-300 border-slate-500/40';

                  return (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-xl p-4 cursor-pointer transition-all"
                      data-testid={`lead-row-${lead.id}`}
                    >
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Source badge */}
                        <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-md ${isWizard ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'bg-slate-600/40 text-slate-300 border border-slate-600/60'}`}>
                          {isWizard ? 'Wizard' : 'Form'}
                        </span>
                        {/* CEFR badge */}
                        {lead.englishLevel && (
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-md text-white ${cefrColor}`}>
                            {lead.englishLevel}
                          </span>
                        )}
                        {/* Name + email */}
                        <div className="flex-1 min-w-[200px]">
                          <p className="text-white font-semibold text-sm">{lead.name}</p>
                          <p className="text-slate-400 text-xs">{lead.email}</p>
                        </div>
                        {/* Role */}
                        {lead.role && (
                          <span className="text-xs text-slate-300 bg-slate-700/50 px-2 py-1 rounded-md capitalize">{lead.role}</span>
                        )}
                        {/* Sector */}
                        {lead.sector && (
                          <span className="text-xs text-slate-400 hidden md:inline truncate max-w-[180px]">{lead.sector}</span>
                        )}
                        {/* Native lang */}
                        {lead.nativeLanguage && (
                          <span className="text-xs text-slate-400 hidden lg:inline">{lead.nativeLanguage}</span>
                        )}
                        {/* Status */}
                        <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-md border ${statusColor}`}>
                          {lead.status || 'pending'}
                        </span>
                        {/* Date */}
                        <span className="text-xs text-slate-500 hidden sm:inline">
                          {new Date(lead.created_at).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Lead detail drawer */}
            {selectedLead && (
              <div
                className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex justify-end"
                onClick={(e) => { if (e.target === e.currentTarget) setSelectedLead(null); }}
                data-testid="lead-detail-drawer"
              >
                <div className="w-full max-w-md bg-slate-900 border-l border-slate-700 h-full overflow-y-auto p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">{selectedLead.name}</h3>
                    <button onClick={() => setSelectedLead(null)} className="text-slate-400 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-3 text-sm">
                    {[
                      ['Email', selectedLead.email],
                      [language === 'it' ? 'Telefono' : 'Phone', selectedLead.phone],
                      ['CEFR', selectedLead.englishLevel],
                      [language === 'it' ? 'Ruolo' : 'Role', selectedLead.role],
                      [language === 'it' ? 'Settore' : 'Sector', selectedLead.sector],
                      [language === 'it' ? 'Lingua madre' : 'Native lang.', selectedLead.nativeLanguage],
                      [language === 'it' ? 'Sorgente' : 'Source', selectedLead.source],
                      [language === 'it' ? 'Creato' : 'Created', new Date(selectedLead.created_at).toLocaleString(language === 'it' ? 'it-IT' : 'en-US')],
                    ].map(([k, v]) => v && (
                      <div key={k} className="flex justify-between gap-4 border-b border-slate-800 pb-2">
                        <span className="text-slate-400 text-xs uppercase tracking-wider">{k}</span>
                        <span className="text-white text-right break-words">{String(v)}</span>
                      </div>
                    ))}
                    {selectedLead.motivation && (
                      <div className="border-b border-slate-800 pb-2">
                        <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">{language === 'it' ? 'Obiettivo' : 'Goal'}</p>
                        <p className="text-white text-sm leading-relaxed">{selectedLead.motivation}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">{language === 'it' ? 'Cambia stato' : 'Update status'}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {['pending','contacted','qualified','closed'].map(s => (
                        <Button
                          key={s} size="sm"
                          onClick={() => updateLead(selectedLead.id, { status: s })}
                          className={`${selectedLead.status === s ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'} text-white text-xs capitalize`}
                          data-testid={`lead-status-${s}`}
                        >
                          {s}
                        </Button>
                      ))}
                    </div>

                    <a
                      href={`mailto:${selectedLead.email}?subject=${encodeURIComponent('VocalFitness — Diagnostic Assessment')}`}
                      className="mt-4 w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      {language === 'it' ? 'Apri client email' : 'Open mail client'}
                    </a>

                    {/* Templated email sender */}
                    <div className="mt-6 pt-6 border-t border-slate-700">
                      <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">
                        {language === 'it' ? 'Invia email da template' : 'Send templated email'}
                      </p>
                      <p className="text-[11px] text-slate-500 mb-3">
                        {language === 'it' ? 'Variabili auto-sostituite: {{name}}, {{englishLevel}}, {{role}}, {{sector}}' : 'Auto-substituted variables: {{name}}, {{englishLevel}}, {{role}}, {{sector}}'}
                      </p>
                      <div className="space-y-2">
                        {[
                          { key: 'welcome', en: 'Welcome onboarding', it: 'Benvenuto onboarding' },
                          { key: 'followup', en: 'Follow-up after 48h', it: 'Follow-up dopo 48h' },
                          { key: 'proposal', en: 'Custom proposal request', it: 'Richiesta proposta su misura' }
                        ].map(tpl => (
                          <Button
                            key={tpl.key}
                            onClick={async () => {
                              if (!window.confirm(language === 'it' ? `Inviare email "${tpl.it}" a ${selectedLead.email}?` : `Send "${tpl.en}" email to ${selectedLead.email}?`)) return;
                              try {
                                const res = await axios.post(
                                  `${backendUrl}/api/admin/leads/${selectedLead.id}/email`,
                                  { template: tpl.key, language },
                                  { headers: { Authorization: `Bearer ${token}` } }
                                );
                                showToast('success', language === 'it' ? `Email inviata: ${res.data.subject}` : `Email sent: ${res.data.subject}`);
                                // Refresh selected lead from backend so drawer shows the new touch + updated status immediately
                                try {
                                  const refreshed = await axios.get(
                                    `${backendUrl}/api/admin/leads?search=${encodeURIComponent(selectedLead.email)}`,
                                    { headers: { Authorization: `Bearer ${token}` } }
                                  );
                                  const updated = (refreshed.data?.items || []).find(l => l.id === selectedLead.id);
                                  if (updated) setSelectedLead(updated);
                                } catch { /* ignore */ }
                                fetchLeads();
                              } catch (e) {
                                showToast('error', e.response?.data?.detail || (language === 'it' ? 'Invio fallito' : 'Send failed'));
                              }
                            }}
                            className="w-full justify-start bg-blue-600/80 hover:bg-blue-600 text-white text-sm"
                            data-testid={`lead-template-${tpl.key}`}
                          >
                            <Send className="w-3.5 h-3.5 mr-2" />
                            {language === 'it' ? tpl.it : tpl.en}
                          </Button>
                        ))}
                      </div>

                      {/* Touch history */}
                      {selectedLead.touches && selectedLead.touches.length > 0 && (
                        <div className="mt-5">
                          <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">
                            {language === 'it' ? 'Cronologia contatti' : 'Touch history'}
                          </p>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {selectedLead.touches.slice().reverse().map((t, i) => (
                              <div key={i} className="text-xs bg-slate-800/60 rounded px-3 py-2 border border-slate-700/40">
                                <div className="flex justify-between text-slate-500">
                                  <span>{t.template || t.type}</span>
                                  <span>{new Date(t.at).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-slate-300 mt-0.5 truncate">{t.subject}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
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

        {/* ===================== POPUP MESSAGES TAB ===================== */}
        {activeTab === 'popups' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-white">{t.popupMessages}</h2>
              <Button onClick={() => { setFormData({ message_type: 'text', target_users: [], is_active: true, popupMediaOption: 'link' }); setShowModal('create-popup'); }} className="bg-amber-600 hover:bg-amber-700" data-testid="add-popup-button">
                <Plus className="w-4 h-4 mr-2" /> {t.newPopup}
              </Button>
            </div>

            {popupMessages.length === 0 ? (
              <div className="text-center py-16">
                <MessageSquare className="w-16 h-16 text-amber-400/30 mx-auto mb-4" />
                <p className="text-slate-400">{t.popupNoMessages}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {popupMessages.map(popup => (
                  <div key={popup.id} className={`bg-slate-800 rounded-xl border p-5 ${popup.is_active ? 'border-amber-500/30' : 'border-slate-700 opacity-60'}`} data-testid={`popup-card-${popup.id}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            popup.message_type === 'text' ? 'bg-blue-500/20 text-blue-300' :
                            popup.message_type === 'audio' ? 'bg-purple-500/20 text-purple-300' :
                            'bg-red-500/20 text-red-300'
                          }`}>
                            {popup.message_type === 'text' ? t.popupTypeText : popup.message_type === 'audio' ? t.popupTypeAudio : t.popupTypeVideo}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${popup.is_active ? 'bg-green-500/20 text-green-300' : 'bg-slate-600/50 text-slate-400'}`}>
                            {popup.is_active ? t.popupActive : t.popupInactive}
                          </span>
                          <span className="px-2 py-1 bg-slate-600/30 text-slate-400 rounded text-xs">
                            {popup.target_users?.length > 0 ? `${popup.target_users.length} ${t.assignedUsers}` : t.popupAllClients}
                          </span>
                        </div>
                        <h3 className="text-white font-semibold text-lg truncate">{popup.title}</h3>
                        {popup.content && <p className="text-slate-400 text-sm mt-1 line-clamp-2">{popup.content}</p>}
                        
                        {/* Stats row */}
                        {popupStats[popup.id] && (
                          <div className="flex items-center gap-4 mt-3" data-testid={`popup-stats-${popup.id}`}>
                            <div className="flex items-center gap-1.5 text-xs">
                              <Eye className="w-3.5 h-3.5 text-blue-400" />
                              <span className="text-blue-300 font-medium">{popupStats[popup.id].views}</span>
                              <span className="text-slate-500">/ {popupStats[popup.id].audience}</span>
                              <span className="text-slate-600 ml-1">({popupStats[popup.id].view_rate}%)</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs">
                              <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-amber-300 font-medium">{popupStats[popup.id].dismissals}</span>
                              <span className="text-slate-600 ml-1">({popupStats[popup.id].dismiss_rate}%)</span>
                            </div>
                          </div>
                        )}

                        <p className="text-slate-500 text-xs mt-2">
                          {new Date(popup.created_at).toLocaleString(language === 'it' ? 'it-IT' : 'en-US')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button onClick={() => handleTogglePopupActive(popup)} variant="ghost" size="sm" className={popup.is_active ? 'text-green-400 hover:text-green-300' : 'text-slate-500 hover:text-slate-400'} data-testid={`toggle-popup-${popup.id}`}>
                          {popup.is_active ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                        </Button>
                        <Button onClick={() => { setEditItem(popup); setFormData({ ...popup, popupMediaOption: popup.media_url ? 'link' : 'link' }); setShowModal('edit-popup'); }} variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300" data-testid={`edit-popup-${popup.id}`}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button onClick={() => handleDeletePopup(popup.id)} variant="ghost" size="sm" className="text-red-400 hover:text-red-300" data-testid={`delete-popup-${popup.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===================== MESSAGING TAB ===================== */}
        {activeTab === 'messaging' && (
          <div className="flex gap-4 h-[calc(100vh-220px)]">
            {/* Conversations sidebar */}
            <div className="w-72 bg-slate-800 rounded-xl overflow-hidden flex flex-col flex-shrink-0">
              <div className="p-3 border-b border-slate-700">
                <h3 className="text-sm font-semibold text-white">{language === 'it' ? 'Conversazioni' : 'Conversations'}</h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                {/* Show all clients for starting new conversations */}
                {clientUsers.map(u => {
                  const conv = conversations.find(c => c.partner?.id === u.id);
                  return (
                    <div key={u.id} onClick={() => openChat(u.id)} className={`p-3 border-b border-slate-700/50 cursor-pointer hover:bg-slate-700/50 transition-colors ${chatUser?.id === u.id ? 'bg-emerald-600/20 border-l-2 border-l-emerald-500' : ''}`} data-testid={`conv-${u.id}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-white text-sm font-medium truncate">{u.full_name || u.username}</span>
                        {conv?.unread_count > 0 && (
                          <span className="bg-emerald-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{conv.unread_count}</span>
                        )}
                      </div>
                      {conv?.last_message && (
                        <p className="text-slate-400 text-xs mt-1 truncate">{conv.last_message.content || `[${conv.last_message.message_type}]`}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 bg-slate-800 rounded-xl overflow-hidden flex flex-col">
              {chatUser ? (
                <>
                  {/* Chat header */}
                  <div className="p-3 border-b border-slate-700 flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-sm">{chatUser.full_name || chatUser.username}</h3>
                      <p className="text-slate-400 text-xs">{chatUser.email || chatUser.username}</p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="chat-messages">
                    {chatMessages.length === 0 && (
                      <p className="text-slate-500 text-center py-8">{language === 'it' ? 'Nessun messaggio. Inizia la conversazione!' : 'No messages. Start the conversation!'}</p>
                    )}
                    {chatMessages.map(m => {
                      const youtubeId = getYouTubeVideoId(m.media_url);
                      const isAdminMessage = m.sender_id !== chatUser.id;
                      return (
                      <div key={m.id} className={`flex ${m.sender_id === chatUser.id ? 'justify-start' : 'justify-end'} group`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 relative ${m.sender_id === chatUser.id ? 'bg-slate-700 text-white' : 'bg-emerald-600 text-white'}`}>
                          {/* Delete button for admin's own messages */}
                          {isAdminMessage && (
                            <button onClick={() => handleDeleteMessage(m.id)} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" title={language === 'it' ? 'Elimina' : 'Delete'}>
                              <X className="w-3 h-3 text-white" />
                            </button>
                          )}
                          {m.message_type === 'task' && (
                            <div className="flex items-center gap-2 text-xs font-medium mb-1 opacity-80">
                              <ClipboardList className="w-3 h-3" /> {language === 'it' ? 'Compito' : 'Task'}
                              {m.task_completed && <span className="text-green-300">({language === 'it' ? 'completato' : 'completed'})</span>}
                            </div>
                          )}
                          {m.content_html ? (
                            <div
                              className="text-sm rich-msg [&_a]:text-amber-300 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h3]:text-base [&_h3]:font-bold [&_p]:my-1"
                              dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(m.content_html) }}
                            />
                          ) : (
                            m.content && <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                          )}
                          {m.task_description && <p className="text-sm mt-1 italic">{m.task_description}</p>}
                          {m.task_due_date && <p className="text-xs mt-1 opacity-70">Scadenza: {m.task_due_date}</p>}
                          
                          {/* Video rendering - YouTube or direct */}
                          {m.media_url && m.message_type === 'video' && (
                            youtubeId ? (
                              <div className="mt-2 rounded-lg overflow-hidden aspect-video">
                                <iframe 
                                  src={`https://www.youtube.com/embed/${youtubeId}`}
                                  className="w-full h-full min-h-[180px]"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  title="Video"
                                />
                              </div>
                            ) : (
                              <video controls className="mt-2 rounded-lg max-w-full max-h-48" src={m.media_url} />
                            )
                          )}
                          
                          {/* Audio rendering */}
                          {m.media_url && m.message_type === 'audio' && (
                            <audio controls className="mt-2 w-full" src={m.media_url} />
                          )}
                          
                          {/* File/Document link */}
                          {m.media_url && m.message_type === 'file' && (
                            <a href={m.media_url} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                              <FileText className="w-4 h-4" />
                              <span className="text-sm underline">{m.file_name || m.media_url.split('/').pop() || 'Apri documento'}</span>
                              <ExternalLink className="w-3 h-3 ml-auto" />
                            </a>
                          )}
                          
                          <p className="text-[10px] mt-1 opacity-50">{new Date(m.created_at).toLocaleString(language === 'it' ? 'it-IT' : 'en-US', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</p>
                        </div>
                      </div>
                    )})}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Message input */}
                  <div className="p-3 border-t border-slate-700 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {['text', 'video', 'audio', 'file', 'task'].map(t => (
                        <button key={t} onClick={() => setMsgType(t)} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${msgType === t ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                          {t === 'text' ? (language === 'it' ? 'Testo' : 'Text') : 
                           t === 'audio' ? 'Audio' : 
                           t === 'video' ? 'Video' : 
                           t === 'file' ? (language === 'it' ? 'File/Link' : 'File/Link') :
                           (language === 'it' ? 'Compito' : 'Task')}
                        </button>
                      ))}
                    </div>
                    {(msgType === 'audio' || msgType === 'video') && (
                      <input type="url" value={msgMediaUrl} onChange={e => setMsgMediaUrl(e.target.value)} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder={language === 'it' ? 'URL media (YouTube, Google Drive, link diretto...)' : 'Media URL (YouTube, Google Drive, direct link...)'} />
                    )}
                    {msgType === 'file' && (
                      <div className="space-y-2">
                        <input type="url" value={msgMediaUrl} onChange={e => setMsgMediaUrl(e.target.value)} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder={language === 'it' ? 'URL documento (PDF, Google Docs, Dropbox...)' : 'Document URL (PDF, Google Docs, Dropbox...)'} />
                        <input type="text" value={msgFileName} onChange={e => setMsgFileName(e.target.value)} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder={language === 'it' ? 'Nome da visualizzare (opzionale)' : 'Display name (optional)'} />
                      </div>
                    )}
                    {msgType === 'task' && (
                      <div className="flex gap-2">
                        <input type="text" value={msgTaskDesc} onChange={e => setMsgTaskDesc(e.target.value)} className="flex-1 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder={language === 'it' ? 'Descrizione compito...' : 'Task description...'} />
                        <input type="date" value={msgTaskDue} onChange={e => setMsgTaskDue(e.target.value)} className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <RichTextEditor
                        value={newMessageHtml}
                        onChange={setNewMessageHtml}
                        onPlainTextChange={setNewMessage}
                        placeholder={language === 'it' ? 'Scrivi un messaggio… (puoi formattare il testo, andare a capo, inserire link)' : 'Write a message… (rich text, line breaks and links supported)'}
                        minHeight={120}
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowEmailPreview(true)}
                          disabled={!newMessage.trim()}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          data-testid="email-preview-btn"
                          title={language === 'it' ? "Anteprima dell'email che riceverà il cliente" : 'Preview the email the client will receive'}
                        >
                          <Mail className="w-4 h-4" />
                          {language === 'it' ? 'Anteprima email' : 'Email preview'}
                        </button>
                        <Button
                          onClick={handleSendMessage}
                          className="bg-emerald-600 hover:bg-emerald-700 px-4"
                          data-testid="send-message-btn"
                        >
                          <Send className="w-4 h-4 mr-1.5" />
                          {language === 'it' ? 'Invia' : 'Send'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Send className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">{language === 'it' ? 'Seleziona un cliente per iniziare' : 'Select a client to start'}</p>
                  </div>
                </div>
              )}
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
                {showModal === 'edit-user' && (language === 'it' ? 'Modifica Utente' : 'Edit User')}
                {showModal === 'import-youtube' && 'Importa Playlist YouTube'}
                {showModal === 'edit-youtube-users' && 'Modifica Utenti Playlist'}
                {showModal === 'create-popup' && (language === 'it' ? 'Nuovo Messaggio Pop-up' : 'New Pop-up Message')}
                {showModal === 'edit-popup' && (language === 'it' ? 'Modifica Messaggio Pop-up' : 'Edit Pop-up Message')}
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
                      <label className="block text-sm text-slate-300 mb-1">{language === 'it' ? 'Tipo *' : 'Type *'}</label>
                      <select value={formData.content_type || 'video'} onChange={e => setFormData({ ...formData, content_type: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" data-testid="content-type-select">
                        <option value="video">🎬 Video (YouTube, Google Drive, MP4)</option>
                        <option value="audio">🎵 Audio (MP3, Google Drive)</option>
                        <option value="pdf">📄 PDF / Documento</option>
                        <option value="embed">📦 Embed Code (iframe, Gamma, ecc.)</option>
                        <option value="link">🔗 Link esterno</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">{language === 'it' ? 'Cartella' : 'Folder'}</label>
                      <select value={formData.folder_id || ''} onChange={e => setFormData({ ...formData, folder_id: e.target.value || null })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                        <option value="">{language === 'it' ? '— Nessuna cartella —' : '— No folder —'}</option>
                        {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Embed Code Section - shown when type is "embed" */}
                  {formData.content_type === 'embed' && (
                    <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-700/50">
                      <label className="block text-sm text-slate-300 mb-2">{language === 'it' ? 'Codice Embed *' : 'Embed Code *'}</label>
                      <textarea 
                        value={formData.embed_code || ''} 
                        onChange={e => setFormData({ ...formData, embed_code: e.target.value, hide_origin: true })} 
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono text-sm" 
                        rows={4}
                        placeholder='<iframe src="https://..." ...></iframe>'
                      />
                      <p className="text-xs text-slate-400 mt-2">
                        {language === 'it' 
                          ? 'Incolla il codice embed completo (es. da Gamma, Canva, Google Slides). L\'origine sarà nascosta automaticamente.'
                          : 'Paste the complete embed code (e.g. from Gamma, Canva, Google Slides). Origin will be hidden automatically.'}
                      </p>
                    </div>
                  )}
                  
                  {/* File Upload - not shown for embed type */}
                  {formData.content_type !== 'embed' && (
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">{language === 'it' ? 'Carica File' : 'Upload File'}</label>
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
                            <Button type="button" onClick={() => fileInputRef.current?.click()} variant="outline" size="sm" className="border-slate-500 text-slate-300">{language === 'it' ? 'Seleziona File' : 'Select File'}</Button>
                            <p className="text-xs text-slate-500 mt-1">Max 100MB</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* URL field - not required for embed type */}
                  {formData.content_type !== 'embed' && (
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">URL {language === 'it' ? 'Contenuto' : 'Content'} *</label>
                      <div className="relative">
                        <input type="url" value={formData.url || ''} onChange={e => setFormData({ ...formData, url: e.target.value })} onBlur={e => { if (e.target.value && !formData.thumbnail_url) autoGenerateThumbnailFromUrl(e.target.value); }} className={`w-full px-3 py-2 bg-slate-700 border rounded-lg text-white ${formData.url ? 'border-green-500' : 'border-slate-600'}`} placeholder="https://..." data-testid="content-url-input" />
                        {formData.url && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />}
                      </div>
                    </div>
                  )}

                  {/* For embed type, add a placeholder URL */}
                  {formData.content_type === 'embed' && !formData.url && (
                    <input type="hidden" value="embed://content" />
                  )}

                  {/* Thumbnail Preview & Custom Upload */}
                  <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
                    <label className="block text-sm text-slate-300 mb-2 font-medium">{language === 'it' ? 'Anteprima / Cover' : 'Thumbnail / Cover'}</label>
                    <div className="flex items-start gap-4">
                      {/* Preview */}
                      <div className="w-32 h-20 rounded-lg overflow-hidden bg-slate-800 border border-slate-600 flex items-center justify-center flex-shrink-0">
                        {formData.thumbnail_url ? (
                          <img src={formData.thumbnail_url} alt="preview" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                        ) : null}
                        <div className={`w-full h-full items-center justify-center text-slate-500 ${formData.thumbnail_url ? 'hidden' : 'flex'}`}>
                          <FileText className="w-6 h-6" />
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        {formData.thumbnail_url && (
                          <p className="text-xs text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {language === 'it' ? 'Anteprima generata' : 'Thumbnail generated'}</p>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          <input ref={thumbnailFileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={(e) => handleCustomThumbnailUpload(e.target.files[0])} className="hidden" />
                          <Button type="button" onClick={() => thumbnailFileInputRef.current?.click()} variant="outline" size="sm" className="border-slate-500 text-slate-300 text-xs" disabled={thumbnailUploading} data-testid="custom-thumbnail-upload">
                            {thumbnailUploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                            {language === 'it' ? 'Cover personalizzata' : 'Custom cover'}
                          </Button>
                          {formData.thumbnail_url && (
                            <Button type="button" onClick={() => setFormData(prev => ({ ...prev, thumbnail_url: '' }))} variant="ghost" size="sm" className="text-red-400 hover:text-red-300 text-xs">
                              <X className="w-3 h-3 mr-1" /> {language === 'it' ? 'Rimuovi' : 'Remove'}
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{language === 'it' ? 'Auto-generata dal file o link. Puoi sovrascriverla con un\'immagine personalizzata.' : 'Auto-generated from file or link. You can override with a custom image.'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.is_public !== false} onChange={e => setFormData({ ...formData, is_public: e.target.checked })} className="w-4 h-4 rounded" />
                      <span className="text-slate-300">{language === 'it' ? 'Pubblico (visibile a tutti)' : 'Public (visible to all)'}</span>
                    </label>
                  </div>

                  {!formData.is_public && clientUsers.length > 0 && (
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">{language === 'it' ? 'Assegna a clienti specifici' : 'Assign to specific clients'}</label>
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

              {/* =================== USER FORM (CREATE + EDIT) =================== */}
              {(showModal === 'create-user' || showModal === 'edit-user') && (
                <>
                  {showModal === 'create-user' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Username *</label>
                        <input type="text" value={formData.username || ''} onChange={e => setFormData({ ...formData, username: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder="es: mario.rossi" data-testid="user-username-input" />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-1">Password *</label>
                        <input type="password" value={formData.password || ''} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" data-testid="user-password-input" />
                      </div>
                    </div>
                  )}
                  {showModal === 'edit-user' && (
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">{language === 'it' ? 'Nuova Password (lascia vuoto per non cambiare)' : 'New Password (leave empty to keep)'}</label>
                      <input type="password" value={formData.password || ''} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder="••••••••" />
                    </div>
                  )}

                  {/* ── ANAGRAFICA ── */}
                  <div className="bg-slate-700/20 rounded-lg border border-slate-600/30 overflow-hidden">
                    <button type="button" onClick={() => toggleCrmSection('anagrafica')} className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors">
                      <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {language === 'it' ? 'Anagrafica' : 'Personal Info'}</p>
                      {crmSections.anagrafica ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                    {crmSections.anagrafica && <div className="px-4 pb-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Nome Completo' : 'Full Name'}</label>
                        <input type="text" value={formData.full_name || ''} onChange={e => setFormData({ ...formData, full_name: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="Mario Rossi" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Email</label>
                        <input type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="mario@email.com" data-testid="user-email-input" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Telefono' : 'Phone'}</label>
                        <input type="tel" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="+39 333 123 4567" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">WhatsApp</label>
                        <input type="tel" value={formData.whatsapp || ''} onChange={e => setFormData({ ...formData, whatsapp: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="+39 333 123 4567" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Data Nascita' : 'DOB'}</label>
                        <input type="date" value={formData.date_of_birth || ''} onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Indirizzo' : 'Address'}</label>
                      <input type="text" value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="Via Roma 1" />
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Città' : 'City'}</label>
                        <input type="text" value={formData.city || ''} onChange={e => setFormData({ ...formData, city: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="Roma" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Prov.' : 'Prov.'}</label>
                        <input type="text" value={formData.province || ''} onChange={e => setFormData({ ...formData, province: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="RM" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">CAP</label>
                        <input type="text" value={formData.postal_code || ''} onChange={e => setFormData({ ...formData, postal_code: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="00100" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Paese' : 'Country'}</label>
                        <input type="text" value={formData.country || 'Italia'} onChange={e => setFormData({ ...formData, country: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Codice Fiscale' : 'Tax Code'}</label>
                        <input type="text" value={formData.fiscal_code || ''} onChange={e => setFormData({ ...formData, fiscal_code: e.target.value.toUpperCase() })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm font-mono" placeholder="RSSMRA80A01H501Q" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Tipo Cliente' : 'Client Type'}</label>
                        <select value={formData.client_type || 'private'} onChange={e => setFormData({ ...formData, client_type: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                          <option value="private">{language === 'it' ? 'Privato' : 'Private'}</option>
                          <option value="business">{language === 'it' ? 'Business / Azienda' : 'Business'}</option>
                          <option value="foreign">{language === 'it' ? 'Estero' : 'Foreign'}</option>
                        </select>
                      </div>
                    </div>
                    </div>}
                  </div>

                  {/* ── DATI AZIENDALI ── */}
                  {(formData.client_type === 'business' || formData.client_type === 'foreign') && (
                    <div className="bg-amber-500/5 rounded-lg border border-amber-500/20 overflow-hidden">
                      <button type="button" onClick={() => toggleCrmSection('azienda')} className="w-full p-4 flex items-center justify-between hover:bg-amber-500/10 transition-colors">
                        <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> {language === 'it' ? 'Dati Aziendali' : 'Business Data'}</p>
                        {crmSections.azienda ? <ChevronUp className="w-4 h-4 text-amber-400" /> : <ChevronDown className="w-4 h-4 text-amber-400" />}
                      </button>
                      {crmSections.azienda && <div className="px-4 pb-4 space-y-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Ragione Sociale' : 'Company Name'}</label>
                        <input type="text" value={formData.company_name || ''} onChange={e => setFormData({ ...formData, company_name: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">P.IVA / VAT</label>
                          <input type="text" value={formData.vat_number || ''} onChange={e => setFormData({ ...formData, vat_number: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm font-mono" placeholder="IT12345678901" />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Codice Univoco SDI' : 'SDI Code'}</label>
                          <input type="text" value={formData.sdi_code || ''} onChange={e => setFormData({ ...formData, sdi_code: e.target.value.toUpperCase() })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm font-mono" placeholder="0000000" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">PEC</label>
                          <input type="email" value={formData.pec || ''} onChange={e => setFormData({ ...formData, pec: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="azienda@pec.it" />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Website</label>
                          <input type="url" value={formData.website || ''} onChange={e => setFormData({ ...formData, website: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="https://..." />
                        </div>
                      </div>
                      </div>}
                    </div>
                  )}

                  {/* ── SOCIAL & DIGITAL ── */}
                  <div className="bg-purple-500/5 rounded-lg border border-purple-500/20 overflow-hidden">
                    <button type="button" onClick={() => toggleCrmSection('social')} className="w-full p-4 flex items-center justify-between hover:bg-purple-500/10 transition-colors">
                      <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> Social & Web</p>
                      {crmSections.social ? <ChevronUp className="w-4 h-4 text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-400" />}
                    </button>
                    {crmSections.social && <div className="px-4 pb-4 space-y-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Sito Web Personale' : 'Personal Website'}</label>
                      <input type="url" value={formData.website || ''} onChange={e => setFormData({ ...formData, website: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="https://miosito.com" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Instagram</label>
                        <input type="text" value={formData.instagram || ''} onChange={e => setFormData({ ...formData, instagram: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="@username" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Facebook</label>
                        <input type="text" value={formData.facebook || ''} onChange={e => setFormData({ ...formData, facebook: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="facebook.com/..." />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">LinkedIn</label>
                        <input type="text" value={formData.linkedin || ''} onChange={e => setFormData({ ...formData, linkedin: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="linkedin.com/in/..." />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">TikTok</label>
                        <input type="text" value={formData.tiktok || ''} onChange={e => setFormData({ ...formData, tiktok: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="@username" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">YouTube</label>
                        <input type="text" value={formData.youtube || ''} onChange={e => setFormData({ ...formData, youtube: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="@channel" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">X (Twitter)</label>
                        <input type="text" value={formData.twitter || ''} onChange={e => setFormData({ ...formData, twitter: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="@username" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Telegram</label>
                        <input type="text" value={formData.telegram || ''} onChange={e => setFormData({ ...formData, telegram: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="@username" />
                      </div>
                    </div>
                    {/* Social follow tracking */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-2">{language === 'it' ? 'Ci segue su:' : 'Follows us on:'}</label>
                      <div className="flex flex-wrap gap-3">
                        {[
                          { key: 'follows_instagram', label: 'Instagram' },
                          { key: 'follows_facebook', label: 'Facebook' },
                          { key: 'follows_youtube', label: 'YouTube' },
                          { key: 'follows_tiktok', label: 'TikTok' },
                        ].map(s => (
                          <label key={s.key} className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={formData[s.key] || false} onChange={e => setFormData({ ...formData, [s.key]: e.target.checked })} className="w-3.5 h-3.5 rounded" />
                            <span className="text-xs text-slate-300">{s.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    </div>}
                  </div>

                  {/* ── MARKETING & CRM ── */}
                  <div className="bg-emerald-500/5 rounded-lg border border-emerald-500/20 overflow-hidden">
                    <button type="button" onClick={() => toggleCrmSection('marketing')} className="w-full p-4 flex items-center justify-between hover:bg-emerald-500/10 transition-colors">
                      <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5" /> Marketing & CRM</p>
                      {crmSections.marketing ? <ChevronUp className="w-4 h-4 text-emerald-400" /> : <ChevronDown className="w-4 h-4 text-emerald-400" />}
                    </button>
                    {crmSections.marketing && <div className="px-4 pb-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Stato Cliente' : 'Client Status'}</label>
                        <select value={formData.client_status || 'active'} onChange={e => setFormData({ ...formData, client_status: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                          <option value="lead">Lead</option>
                          <option value="prospect">Prospect</option>
                          <option value="active">{language === 'it' ? 'Attivo' : 'Active'}</option>
                          <option value="inactive">{language === 'it' ? 'Inattivo' : 'Inactive'}</option>
                          <option value="vip">VIP</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Livello Engagement' : 'Engagement Level'}</label>
                        <select value={formData.engagement_level || ''} onChange={e => setFormData({ ...formData, engagement_level: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                          <option value="">-</option>
                          <option value="cold">{language === 'it' ? 'Freddo' : 'Cold'}</option>
                          <option value="warm">{language === 'it' ? 'Tiepido' : 'Warm'}</option>
                          <option value="hot">{language === 'it' ? 'Caldo' : 'Hot'}</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Come ci ha trovato' : 'Lead Source'}</label>
                        <select value={formData.lead_source || ''} onChange={e => setFormData({ ...formData, lead_source: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                          <option value="">-</option>
                          <option value="google">Google</option>
                          <option value="instagram">Instagram</option>
                          <option value="facebook">Facebook</option>
                          <option value="youtube">YouTube</option>
                          <option value="tiktok">TikTok</option>
                          <option value="referral">{language === 'it' ? 'Passaparola' : 'Referral'}</option>
                          <option value="event">{language === 'it' ? 'Evento' : 'Event'}</option>
                          <option value="website">Website</option>
                          <option value="other">{language === 'it' ? 'Altro' : 'Other'}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Referente / Segnalato da' : 'Referred by'}</label>
                        <input type="text" value={formData.referral || ''} onChange={e => setFormData({ ...formData, referral: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder={language === 'it' ? 'Nome referente' : 'Referrer name'} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Contatto Preferito' : 'Preferred Contact'}</label>
                        <select value={formData.preferred_contact || ''} onChange={e => setFormData({ ...formData, preferred_contact: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                          <option value="">-</option>
                          <option value="email">Email</option>
                          <option value="phone">{language === 'it' ? 'Telefono' : 'Phone'}</option>
                          <option value="whatsapp">WhatsApp</option>
                          <option value="instagram">Instagram DM</option>
                          <option value="telegram">Telegram</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Ultimo Contatto' : 'Last Contact'}</label>
                        <input type="date" value={formData.last_contact_date || ''} onChange={e => setFormData({ ...formData, last_contact_date: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Interessi / Obiettivi' : 'Interests / Goals'}</label>
                      <input type="text" value={formData.interests || ''} onChange={e => setFormData({ ...formData, interests: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder={language === 'it' ? 'es: canto, dizione, public speaking' : 'e.g.: singing, diction, public speaking'} />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Tag (separati da virgola)' : 'Tags (comma-separated)'}</label>
                      <input type="text" value={formData.tags || ''} onChange={e => setFormData({ ...formData, tags: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder={language === 'it' ? 'es: principiante, cantante, corso-base' : 'e.g.: beginner, singer, basic-course'} />
                    </div>
                    {/* Consent checkboxes */}
                    <div className="flex flex-wrap gap-4 pt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={formData.marketing_email_consent || false} onChange={e => setFormData({ ...formData, marketing_email_consent: e.target.checked })} className="w-3.5 h-3.5 rounded" />
                        <span className="text-xs text-slate-300">{language === 'it' ? 'Consenso email marketing' : 'Email marketing consent'}</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={formData.marketing_sms_consent || false} onChange={e => setFormData({ ...formData, marketing_sms_consent: e.target.checked })} className="w-3.5 h-3.5 rounded" />
                        <span className="text-xs text-slate-300">{language === 'it' ? 'Consenso SMS marketing' : 'SMS marketing consent'}</span>
                      </label>
                    </div>
                    </div>}
                  </div>

                  {/* ── NOTE & ACQUISTI ── */}
                  <div className="bg-slate-700/20 rounded-lg border border-slate-600/30 overflow-hidden">
                    <button type="button" onClick={() => toggleCrmSection('notes')} className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> {language === 'it' ? 'Note & Storico' : 'Notes & History'}</p>
                      {crmSections.notes ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                    {crmSections.notes && <div className="px-4 pb-4 space-y-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Note Admin' : 'Admin Notes'}</label>
                      <textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" rows={2} />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">{language === 'it' ? 'Storico Acquisti' : 'Purchase History'}</label>
                      <textarea value={formData.purchase_history || ''} onChange={e => setFormData({ ...formData, purchase_history: e.target.value })} className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" rows={2} placeholder={language === 'it' ? 'Es: Corso Base - 01/2026 - 500EUR' : 'E.g.: Basic Course - 01/2026 - 500EUR'} />
                    </div>
                    </div>}
                  </div>

                  {/* ── RUOLO UTENTE ── */}
                  <div className="bg-cyan-500/5 rounded-lg p-4 border border-cyan-500/20">
                    <label className="block text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 mb-3"><Briefcase className="w-3.5 h-3.5" /> {language === 'it' ? 'Ruolo Sistema' : 'System Role'}</label>
                    <select value={formData.role || 'client'} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" data-testid="user-role-select">
                      <option value="lead">📝 Lead</option>
                      <option value="client">👤 {language === 'it' ? 'Cliente' : 'Client'}</option>
                      <option value="collaborator">🤝 {language === 'it' ? 'Collaboratore' : 'Collaborator'}</option>
                      <option value="editor">✏️ Editor</option>
                      <option value="manager">📊 Manager</option>
                      <option value="admin">🔐 Admin</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-2">
                      {language === 'it' 
                        ? '• Lead/Cliente: accesso area clienti • Collaboratore/Editor: accesso limitato admin • Manager/Admin: accesso completo'
                        : '• Lead/Client: client area access • Collaborator/Editor: limited admin • Manager/Admin: full access'}
                    </p>
                  </div>
                </>
              )}

              {/* =================== YOUTUBE IMPORT FORM =================== */}
              {showModal === 'import-youtube' && (
                <>
                  <div className="bg-red-900/20 rounded-lg p-4 border border-red-700/50 mb-4">
                    <div className="flex items-center gap-2 text-red-300 mb-2">
                      <Youtube className="w-5 h-5" />
                      <span className="font-medium">Importazione Playlist</span>
                    </div>
                    <p className="text-sm text-slate-400">
                      Incolla l'URL di una playlist YouTube. Verrà creata una cartella con tutti i video della playlist.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">URL Playlist YouTube *</label>
                    <input 
                      type="url" 
                      value={formData.playlist_url || ''} 
                      onChange={e => setFormData({ ...formData, playlist_url: e.target.value })} 
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" 
                      placeholder="https://www.youtube.com/playlist?list=..." 
                      data-testid="youtube-url-input" 
                    />
                    <p className="text-xs text-slate-500 mt-1">Es: https://www.youtube.com/playlist?list=PLxxxxxx</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.is_public === true} 
                        onChange={e => setFormData({ ...formData, is_public: e.target.checked })} 
                        className="w-4 h-4 rounded" 
                      />
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
                </>
              )}

              {/* =================== YOUTUBE EDIT USERS FORM =================== */}
              {showModal === 'edit-youtube-users' && editItem && (
                <>
                  <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-700/50 mb-4">
                    <p className="text-sm text-slate-300">
                      Modifica gli utenti assegnati alla playlist <strong className="text-white">{editItem.playlist_title || editItem.folder_name}</strong>.
                      Le modifiche si applicheranno alla cartella e a tutti i video.
                    </p>
                  </div>
                  
                  {clientUsers.length > 0 ? (
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">Seleziona clienti</label>
                      <div className="max-h-60 overflow-y-auto bg-slate-700/50 rounded-lg p-2 space-y-1">
                        {clientUsers.map(u => (
                          <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-slate-600/50 rounded cursor-pointer">
                            <input type="checkbox" checked={(formData.assigned_users || []).includes(u.id)} onChange={() => toggleUserSelection(u.id)} className="w-4 h-4 rounded" />
                            <span className="text-white">{u.full_name || u.username}</span>
                            <span className="text-slate-400 text-sm">({u.email || u.username})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-center py-4">Nessun cliente disponibile. Crea prima un utente cliente.</p>
                  )}
                </>
              )}

              {/* =================== POPUP MESSAGE FORM =================== */}
              {(showModal === 'create-popup' || showModal === 'edit-popup') && (
                <>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">{t.popupTitle} *</label>
                    <input type="text" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder={language === 'it' ? 'Es: Offerta Speciale!' : 'E.g.: Special Offer!'} data-testid="popup-title-input" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">{t.popupType} *</label>
                    <select value={formData.message_type || 'text'} onChange={e => setFormData({ ...formData, message_type: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" data-testid="popup-type-select">
                      <option value="text">{t.popupTypeText}</option>
                      <option value="audio">{t.popupTypeAudio}</option>
                      <option value="video">{t.popupTypeVideo}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">{t.popupContent}</label>
                    <textarea value={formData.content || ''} onChange={e => setFormData({ ...formData, content: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" rows={3} placeholder={language === 'it' ? 'Testo del messaggio...' : 'Message text...'} data-testid="popup-content-input" />
                  </div>

                  {/* Media section for audio/video */}
                  {(formData.message_type === 'audio' || formData.message_type === 'video') && (
                    <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50 space-y-3">
                      <label className="block text-sm text-slate-300 font-medium">{t.popupMediaOption}</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="mediaOption" checked={formData.popupMediaOption === 'upload'} onChange={() => setFormData({ ...formData, popupMediaOption: 'upload' })} className="w-4 h-4" />
                          <span className="text-slate-300 text-sm">{t.popupMediaUpload}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="mediaOption" checked={formData.popupMediaOption !== 'upload'} onChange={() => setFormData({ ...formData, popupMediaOption: 'link' })} className="w-4 h-4" />
                          <span className="text-slate-300 text-sm">{t.popupMediaLink}</span>
                        </label>
                      </div>

                      {formData.popupMediaOption === 'upload' ? (
                        <div className={`border-2 border-dashed rounded-lg p-4 text-center ${popupMediaUploading ? 'border-amber-500 bg-amber-500/10' : 'border-slate-600 hover:border-amber-500/50'}`}>
                          {popupMediaUploading ? (
                            <div className="space-y-2">
                              <Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto" />
                              <div className="w-full bg-slate-600 rounded-full h-2"><div className="bg-amber-500 h-2 rounded-full" style={{ width: `${popupMediaProgress}%` }} /></div>
                              <p className="text-sm text-amber-300">{popupMediaProgress}%</p>
                            </div>
                          ) : (
                            <>
                              <Upload className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                              <input ref={popupFileInputRef} type="file" accept={formData.message_type === 'audio' ? '.mp3,.wav,.ogg,.m4a,.aac' : '.mp4,.webm,.mov,.avi,.mkv'} onChange={(e) => handlePopupMediaUpload(e.target.files[0])} className="hidden" />
                              <Button type="button" onClick={() => popupFileInputRef.current?.click()} variant="outline" size="sm" className="border-slate-500 text-slate-300">{t.popupUploadMedia}</Button>
                              <p className="text-xs text-slate-500 mt-1">Max 100MB</p>
                              {formData.media_url && <p className="text-xs text-green-400 mt-2 flex items-center justify-center gap-1"><CheckCircle className="w-3 h-3" /> File caricato</p>}
                            </>
                          )}
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="block text-sm text-slate-300 mb-1">{t.popupMediaUrl}</label>
                            <input type="url" value={formData.media_url || ''} onChange={e => setFormData({ ...formData, media_url: e.target.value })} onBlur={e => { if (e.target.value && !formData.thumbnail_url) autoGenerateThumbnailFromUrl(e.target.value); }} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder={t.popupMediaUrlPlaceholder} data-testid="popup-media-url-input" />
                          </div>
                          <div>
                            <label className="block text-sm text-slate-300 mb-1">{t.popupEmbedCode}</label>
                            <textarea value={formData.embed_code || ''} onChange={e => setFormData({ ...formData, embed_code: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono text-xs" rows={3} placeholder={t.popupEmbedPlaceholder} data-testid="popup-embed-input" />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Popup Thumbnail / Cover */}
                  <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
                    <label className="block text-sm text-slate-300 mb-2 font-medium">{language === 'it' ? 'Anteprima / Cover Pop-up' : 'Popup Thumbnail / Cover'}</label>
                    <div className="flex items-start gap-4">
                      <div className="w-32 h-20 rounded-lg overflow-hidden bg-slate-800 border border-slate-600 flex items-center justify-center flex-shrink-0">
                        {formData.thumbnail_url ? (
                          <img src={formData.thumbnail_url} alt="preview" className="w-full h-full object-cover" />
                        ) : (
                          <MessageSquare className="w-6 h-6 text-slate-500" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        {formData.thumbnail_url && (
                          <p className="text-xs text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {language === 'it' ? 'Cover impostata' : 'Cover set'}</p>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          <input ref={thumbnailFileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.gif" onChange={(e) => handleCustomThumbnailUpload(e.target.files[0])} className="hidden" />
                          <Button type="button" onClick={() => thumbnailFileInputRef.current?.click()} variant="outline" size="sm" className="border-slate-500 text-slate-300 text-xs" disabled={thumbnailUploading} data-testid="popup-custom-thumbnail-upload">
                            {thumbnailUploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                            {language === 'it' ? 'Cover personalizzata' : 'Custom cover'}
                          </Button>
                          {formData.thumbnail_url && (
                            <Button type="button" onClick={() => setFormData(prev => ({ ...prev, thumbnail_url: '' }))} variant="ghost" size="sm" className="text-red-400 hover:text-red-300 text-xs">
                              <X className="w-3 h-3 mr-1" /> {language === 'it' ? 'Rimuovi' : 'Remove'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">{t.popupButtonText}</label>
                      <input type="text" value={formData.button_text || ''} onChange={e => setFormData({ ...formData, button_text: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder={language === 'it' ? 'Es: Scopri di più' : 'E.g.: Learn More'} />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">{t.popupButtonUrl}</label>
                      <input type="url" value={formData.button_url || ''} onChange={e => setFormData({ ...formData, button_url: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white" placeholder="https://..." />
                    </div>
                  </div>

                  {/* Target users */}
                  <div>
                    <label className="block text-sm text-slate-300 mb-2">{t.popupTarget}</label>
                    <div className="flex gap-4 mb-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="targetOption" checked={!formData.target_users || formData.target_users.length === 0} onChange={() => setFormData({ ...formData, target_users: [] })} className="w-4 h-4" />
                        <span className="text-slate-300 text-sm">{t.popupTargetAll}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="targetOption" checked={formData.target_users && formData.target_users.length > 0} onChange={() => setFormData({ ...formData, target_users: formData.target_users?.length > 0 ? formData.target_users : ['_select'] })} className="w-4 h-4" />
                        <span className="text-slate-300 text-sm">{t.popupTargetSpecific}</span>
                      </label>
                    </div>
                    {formData.target_users && formData.target_users.length > 0 && clientUsers.length > 0 && (
                      <div className="max-h-40 overflow-y-auto bg-slate-700/50 rounded-lg p-2 space-y-1">
                        {clientUsers.map(u => (
                          <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-slate-600/50 rounded cursor-pointer">
                            <input type="checkbox" checked={formData.target_users.includes(u.id)} onChange={() => {
                              const current = formData.target_users.filter(id => id !== '_select');
                              if (current.includes(u.id)) {
                                const next = current.filter(id => id !== u.id);
                                setFormData({ ...formData, target_users: next.length > 0 ? next : [] });
                              } else {
                                setFormData({ ...formData, target_users: [...current, u.id] });
                              }
                            }} className="w-4 h-4 rounded" />
                            <span className="text-white">{u.full_name || u.username}</span>
                            <span className="text-slate-400 text-sm">({u.email || u.username})</span>
                          </label>
                        ))}
                      </div>
                    )}
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
                else if (showModal === 'edit-user') handleUpdateUser();
                else if (showModal === 'import-youtube') handleImportYoutubePlaylist();
                else if (showModal === 'edit-youtube-users') handleUpdatePlaylistUsers(editItem?.id);
                else if (showModal === 'create-popup') handleCreatePopup();
                else if (showModal === 'edit-popup') handleUpdatePopup();
              }} disabled={submitting || youtubeImporting} className={showModal === 'import-youtube' ? 'bg-red-600 hover:bg-red-700' : showModal.includes('popup') ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'} data-testid="save-button">
                {(submitting || youtubeImporting) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                {showModal === 'import-youtube' ? 'Importa' : 'Salva'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Email Preview Modal (admin → client) ===== */}
      <EmailPreviewModal
        isOpen={showEmailPreview}
        onClose={() => setShowEmailPreview(false)}
        contentHtml={newMessageHtml}
        contentPlain={newMessage}
        recipientEmail={chatUser?.email}
        recipientName={chatUser?.full_name || chatUser?.username}
        senderName={user?.full_name || 'VocalFitness Admin'}
        messageType={msgType}
      />
    </div>
  );
};

export default AdminPage;

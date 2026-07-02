import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Users, FolderOpen, Plus, Trash2, Edit,
  Loader2, Video, FileText, Music, Link as LinkIcon,
  Save, X, Upload, CheckCircle, AlertCircle, HardDrive,
  Folder, Eye, EyeOff, UserCheck, Youtube, RefreshCw, ExternalLink,
  MessageSquare, Bell, Power, PowerOff, Send, Building2, User,
  ClipboardList, Calendar, ChevronDown, ChevronUp, UserPlus, Briefcase, Inbox, Search, Filter, Mail, AudioLines, Mic
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { RichTextEditor, sanitizeRichHtml } from '../components/RichTextEditor';
import { EmailPreviewModal } from '../components/EmailPreviewModal';
import { ElevenLabsStudio } from '../components/ElevenLabsStudio';
import { AdminLeadsTab } from './admin/AdminLeadsTab';
import { AdminDatabaseTab } from './admin/AdminDatabaseTab';
import { AdminPopupsTab } from './admin/AdminPopupsTab';
import { AdminFoldersTab } from './admin/AdminFoldersTab';
import { AdminContentTab } from './admin/AdminContentTab';
import { AdminUsersTab } from './admin/AdminUsersTab';
import { AdminYouTubeTab } from './admin/AdminYouTubeTab';
import { AdminMessagingTab } from './admin/AdminMessagingTab';
import { AdminEditorModal } from './admin/AdminEditorModal';
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
          <Button onClick={() => navigate('/admin/phonemes')} className="bg-gradient-to-r from-cyan-600 to-orange-500 hover:from-cyan-500 hover:to-orange-400 text-white font-bold" data-testid="tab-phonemes-cms">
            <Mic className="w-4 h-4 mr-2" /> Phoneme CMS
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
          <AdminFoldersTab
            language={language}
            t={t}
            folders={folders}
            setFormData={setFormData}
            setShowModal={setShowModal}
            setEditItem={setEditItem}
            handleDeleteFolder={handleDeleteFolder}
          />
        )}


        {/* ===================== CONTENT TAB ===================== */}
        {activeTab === 'content' && (
          <AdminContentTab
            language={language}
            contents={contents}
            getContentIcon={getContentIcon}
            regeneratingThumbs={regeneratingThumbs}
            regeneratingThumbId={regeneratingThumbId}
            handleRegenerateAllThumbnails={handleRegenerateAllThumbnails}
            handleRegenerateThumbnail={handleRegenerateThumbnail}
            setFormData={setFormData}
            setShowModal={setShowModal}
            setEditItem={setEditItem}
            handleDeleteContent={handleDeleteContent}
          />
        )}


        {/* ===================== USERS TAB ===================== */}
        {activeTab === 'users' && (
          <AdminUsersTab
            language={language}
            t={t}
            users={users}
            setFormData={setFormData}
            setShowModal={setShowModal}
            setEditItem={setEditItem}
            openChat={openChat}
            setActiveTab={setActiveTab}
            fetchConversations={fetchConversations}
            handleDeleteUser={handleDeleteUser}
          />
        )}


        {/* ===================== YOUTUBE TAB ===================== */}
        {activeTab === 'youtube' && (
          <AdminYouTubeTab
            language={language}
            t={t}
            youtubePlaylists={youtubePlaylists}
            youtubeSyncing={youtubeSyncing}
            handleSyncAllPlaylists={handleSyncAllPlaylists}
            handleSyncPlaylist={handleSyncPlaylist}
            handleDeleteYoutubePlaylist={handleDeleteYoutubePlaylist}
            setFormData={setFormData}
            setShowModal={setShowModal}
            setEditItem={setEditItem}
          />
        )}


        {/* ===================== LEAD INBOX TAB ===================== */}
        {activeTab === 'audio-studio' && (
          <ElevenLabsStudio token={token} language={language} />
        )}

        {activeTab === 'leads' && (
          <AdminLeadsTab
            language={language}
            leads={leads}
            leadsLoading={leadsLoading}
            leadFilters={leadFilters}
            setLeadFilters={setLeadFilters}
            selectedLead={selectedLead}
            setSelectedLead={setSelectedLead}
            fetchLeads={fetchLeads}
            updateLead={updateLead}
            backendUrl={backendUrl}
            token={token}
            showToast={showToast}
          />
        )}


        {/* ===================== DATABASE TAB (extracted) ===================== */}
        {activeTab === 'database' && (
          <AdminDatabaseTab databaseStats={databaseStats} />
        )}


        {/* ===================== POPUP MESSAGES TAB (extracted) ===================== */}
        {activeTab === 'popups' && (
          <AdminPopupsTab
            language={language}
            t={t}
            popupMessages={popupMessages}
            popupStats={popupStats}
            setFormData={setFormData}
            setShowModal={setShowModal}
            setEditItem={setEditItem}
            handleTogglePopupActive={handleTogglePopupActive}
            handleDeletePopup={handleDeletePopup}
          />
        )}


        {/* ===================== MESSAGING TAB ===================== */}
        {activeTab === 'messaging' && (
          <AdminMessagingTab
            language={language}
            clientUsers={clientUsers}
            conversations={conversations}
            chatUser={chatUser}
            chatMessages={chatMessages}
            openChat={openChat}
            handleSendMessage={handleSendMessage}
            handleDeleteMessage={handleDeleteMessage}
            getYouTubeVideoId={getYouTubeVideoId}
            chatEndRef={chatEndRef}
            msgType={msgType} setMsgType={setMsgType}
            msgMediaUrl={msgMediaUrl} setMsgMediaUrl={setMsgMediaUrl}
            msgFileName={msgFileName} setMsgFileName={setMsgFileName}
            msgTaskDesc={msgTaskDesc} setMsgTaskDesc={setMsgTaskDesc}
            msgTaskDue={msgTaskDue} setMsgTaskDue={setMsgTaskDue}
            newMessage={newMessage} setNewMessage={setNewMessage}
            newMessageHtml={newMessageHtml} setNewMessageHtml={setNewMessageHtml}
            setShowEmailPreview={setShowEmailPreview}
          />
        )}

      </div>

      {/* ===================== EDITOR MODAL (extracted) ===================== */}
      <AdminEditorModal
        showModal={showModal}
        editItem={editItem}
        formData={formData}
        submitting={submitting}
        youtubeImporting={youtubeImporting}
        crmSections={crmSections}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        thumbnailUploading={thumbnailUploading}
        popupMediaUploading={popupMediaUploading}
        popupMediaProgress={popupMediaProgress}
        fileInputRef={fileInputRef}
        thumbnailFileInputRef={thumbnailFileInputRef}
        popupFileInputRef={popupFileInputRef}
        setShowModal={setShowModal}
        setEditItem={setEditItem}
        setFormData={setFormData}
        toggleCrmSection={toggleCrmSection}
        folders={folders}
        clientUsers={clientUsers}
        language={language}
        t={t}
        handleFileUpload={handleFileUpload}
        handleCustomThumbnailUpload={handleCustomThumbnailUpload}
        handlePopupMediaUpload={handlePopupMediaUpload}
        autoGenerateThumbnailFromUrl={autoGenerateThumbnailFromUrl}
        toggleUserSelection={toggleUserSelection}
        handleCreateFolder={handleCreateFolder}
        handleUpdateFolder={handleUpdateFolder}
        handleCreateContent={handleCreateContent}
        handleUpdateContent={handleUpdateContent}
        handleCreateUser={handleCreateUser}
        handleUpdateUser={handleUpdateUser}
        handleImportYoutubePlaylist={handleImportYoutubePlaylist}
        handleUpdatePlaylistUsers={handleUpdatePlaylistUsers}
        handleCreatePopup={handleCreatePopup}
        handleUpdatePopup={handleUpdatePopup}
      />


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

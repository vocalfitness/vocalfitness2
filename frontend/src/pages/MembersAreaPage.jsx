import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  LogOut, Video, FileText, Music, Link as LinkIcon, 
  Loader2, Home, User, FolderOpen, ChevronRight,
  Play, Download, ExternalLink, Settings, KeyRound,
  Folder, ArrowLeft, X, Volume2, Bell, Send, ClipboardList,
  Check, MessageCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

// Translations for Members Area
const translations = {
  it: {
    membersArea: "Area Riservata",
    welcome: "Benvenuto",
    adminPanel: "Pannello Admin",
    settings: "Impostazioni",
    logout: "Esci",
    backToSite: "Torna al Sito",
    loading: "Caricamento...",
    folders: "Cartelle",
    allContent: "Tutti i Contenuti",
    back: "Indietro",
    watch: "Guarda",
    download: "Scarica",
    open: "Apri",
    noFolders: "Nessuna cartella disponibile",
    noContent: "Nessun contenuto disponibile",
    contentInFolder: "contenuti"
  },
  en: {
    membersArea: "Members Area",
    welcome: "Welcome",
    adminPanel: "Admin Panel",
    settings: "Settings",
    logout: "Logout",
    backToSite: "Back to Site",
    loading: "Loading...",
    folders: "Folders",
    allContent: "All Content",
    back: "Back",
    watch: "Watch",
    download: "Download",
    open: "Open",
    noFolders: "No folders available",
    noContent: "No content available",
    contentInFolder: "contents"
  }
};

const MembersAreaPage = () => {
  const navigate = useNavigate();
  const { user, token, logout, isAdmin, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const t = translations[language] || translations.en;
  const [contents, setContents] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState(null);
  const [popupMessages, setPopupMessages] = useState([]);
  const [currentPopup, setCurrentPopup] = useState(null);
  const [showMessages, setShowMessages] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const chatEndRef = useRef(null);

  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Fetch folders and content
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      
      try {
        const [foldersRes, contentRes] = await Promise.all([
          axios.get(`${backendUrl}/api/members/folders`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${backendUrl}/api/members/content`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        setFolders(foldersRes.data);
        setContents(contentRes.data);
      } catch (error) {
        console.error('Error fetching content:', error);
        if (error.response?.status === 401) {
          logout();
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, backendUrl, logout, navigate]);

  // Fetch content when folder changes
  useEffect(() => {
    const fetchFolderContent = async () => {
      if (!token) return;
      
      try {
        const url = selectedFolder 
          ? `${backendUrl}/api/members/content?folder_id=${selectedFolder.id}`
          : `${backendUrl}/api/members/content`;
        
        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setContents(response.data);
      } catch (error) {
        console.error('Error fetching folder content:', error);
      }
    };

    fetchFolderContent();
  }, [selectedFolder, token, backendUrl]);

  // Fetch popup messages
  useEffect(() => {
    const fetchPopups = async () => {
      if (!token) return;
      try {
        const res = await axios.get(`${backendUrl}/api/members/popups`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data && res.data.length > 0) {
          setPopupMessages(res.data);
          setCurrentPopup(res.data[0]);
          // Record view for the first popup
          axios.post(`${backendUrl}/api/members/popups/${res.data[0].id}/view`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => {});
        }
      } catch (error) {
        console.error('Error fetching popups:', error);
      }
    };
    fetchPopups();
  }, [token, backendUrl]);

  const handleDismissPopup = async (popupId) => {
    try {
      await axios.post(`${backendUrl}/api/members/popups/${popupId}/dismiss`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Error dismissing popup:', error);
    }
    const remaining = popupMessages.filter(p => p.id !== popupId);
    setPopupMessages(remaining);
    if (remaining.length > 0) {
      setCurrentPopup(remaining[0]);
      // Record view for next popup
      axios.post(`${backendUrl}/api/members/popups/${remaining[0].id}/view`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    } else {
      setCurrentPopup(null);
    }
  };

  const handleClosePopup = () => {
    const remaining = popupMessages.slice(1);
    setPopupMessages(remaining);
    if (remaining.length > 0) {
      setCurrentPopup(remaining[0]);
      // Record view for next popup
      axios.post(`${backendUrl}/api/members/popups/${remaining[0].id}/view`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    } else {
      setCurrentPopup(null);
    }
  };

  // Fetch unread count
  useEffect(() => {
    const fetchUnread = async () => {
      if (!token) return;
      try {
        const res = await axios.get(`${backendUrl}/api/members/messages/unread-count`, { headers: { Authorization: `Bearer ${token}` } });
        setUnreadCount(res.data.unread_count || 0);
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [token, backendUrl]);

  const openMessages = async () => {
    setShowMessages(true);
    try {
      const res = await axios.get(`${backendUrl}/api/members/messages`, { headers: { Authorization: `Bearer ${token}` } });
      setChatMessages(res.data || []);
      setUnreadCount(0);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {}
  };

  const handleSendClientMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      const res = await axios.post(`${backendUrl}/api/members/messages`, {
        recipient_id: 'admin', content: newMessage, message_type: 'text'
      }, { headers: { Authorization: `Bearer ${token}` } });
      setChatMessages(prev => [...prev, res.data]);
      setNewMessage('');
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch {}
  };

  const handleCompleteTask = async (messageId) => {
    try {
      await axios.post(`${backendUrl}/api/members/messages/${messageId}/complete-task`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setChatMessages(prev => prev.map(m => m.id === messageId ? { ...m, task_completed: true } : m));
    } catch {}
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Helper: extract YouTube video ID from any YouTube URL format
  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]+)/,
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
      /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/,
      /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]+)/,
      /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const getContentIcon = (type) => {
    switch (type) {
      case 'video': return <Video className="w-5 h-5" />;
      case 'pdf': return <FileText className="w-5 h-5" />;
      case 'audio': return <Music className="w-5 h-5" />;
      case 'link': return <LinkIcon className="w-5 h-5" />;
      case 'embed': return <FolderOpen className="w-5 h-5" />;
      default: return <FolderOpen className="w-5 h-5" />;
    }
  };

  const getContentAction = (content) => {
    switch (content.content_type) {
      case 'video':
        return (
          <Button onClick={() => setSelectedContent(content)} className="bg-blue-600 hover:bg-blue-700" data-testid={`play-${content.id}`}>
            <Play className="w-4 h-4 mr-2" /> {t.watch}
          </Button>
        );
      case 'pdf':
        return (
          <a href={content.url} target="_blank" rel="noopener noreferrer">
            <Button className="bg-green-600 hover:bg-green-700" data-testid={`download-${content.id}`}>
              <Download className="w-4 h-4 mr-2" /> {t.download}
            </Button>
          </a>
        );
      case 'audio':
        return (
          <Button onClick={() => setSelectedContent(content)} className="bg-purple-600 hover:bg-purple-700" data-testid={`listen-${content.id}`}>
            <Play className="w-4 h-4 mr-2" /> {language === 'it' ? 'Ascolta' : 'Listen'}
          </Button>
        );
      case 'embed':
        return (
          <Button onClick={() => setSelectedContent(content)} className="bg-pink-600 hover:bg-pink-700" data-testid={`view-${content.id}`}>
            <Play className="w-4 h-4 mr-2" /> {language === 'it' ? 'Visualizza' : 'View'}
          </Button>
        );
      case 'link':
        return (
          <a href={content.url} target="_blank" rel="noopener noreferrer">
            <Button className="bg-cyan-600 hover:bg-cyan-700" data-testid={`open-${content.id}`}>
              <ExternalLink className="w-4 h-4 mr-2" /> {t.open}
            </Button>
          </a>
        );
      default:
        return null;
    }
  };

  // Filter content based on selected folder
  const displayedContents = selectedFolder 
    ? contents
    : contents.filter(c => !c.folder_id); // Show only content without folder when no folder selected

  // Content without folders (for "Tutti i contenuti")
  const contentWithoutFolder = contents.filter(c => !c.folder_id);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-blue-200">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">{t.membersArea}</h1>
              <p className="text-blue-300 text-sm">VocalFitness</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2 text-blue-200">
              <User className="w-4 h-4" />
              <span className="text-sm">{user?.full_name || user?.username}</span>
            </div>
            
            {isAdmin() && (
              <Button onClick={() => navigate('/admin')} variant="outline" className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20" data-testid="admin-panel-button">
                <Settings className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Admin</span>
              </Button>
            )}
            
            <Button onClick={openMessages} variant="outline" className="border-emerald-400/50 text-emerald-400 hover:bg-emerald-500/20 relative" data-testid="messages-button">
              <MessageCircle className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{unreadCount}</span>
              )}
            </Button>
            
            <Button onClick={() => navigate('/impostazioni')} variant="outline" className="border-white/20 text-white hover:bg-white/10" data-testid="settings-button">
              <KeyRound className="w-4 h-4" />
            </Button>
            
            <Button onClick={() => navigate('/')} variant="outline" className="border-white/20 text-white hover:bg-white/10">
              <Home className="w-4 h-4" />
            </Button>
            
            <Button onClick={handleLogout} variant="outline" className="border-red-400/50 text-red-400 hover:bg-red-500/20" data-testid="logout-button">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-2xl p-6 border border-blue-500/20">
          <h2 className="text-2xl font-bold text-white mb-2">
            {t.welcome}, {user?.full_name || user?.username}! 👋
          </h2>
          <p className="text-blue-200">
            {language === 'it' 
              ? 'Accedi ai tuoi contenuti esclusivi per migliorare il tuo Business English.'
              : 'Access your exclusive content to improve your Business English.'}
          </p>
        </div>

        {/* LMS — Vocal Fitness Phonetic Lab (Phase 1 Preview) */}
        <a
          href="/lms/phoneme/u-foot"
          className="group block mb-8 relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-8 hover:border-cyan-400 transition-all duration-500 hover:shadow-[0_0_40px_rgba(34,211,238,0.25)]"
          data-testid="members-lms-cta"
        >
          {/* Scanline accent */}
          <div className="pointer-events-none absolute inset-0 opacity-30" style={{
            backgroundImage: 'linear-gradient(rgba(34,211,238,0.04) 1px, transparent 1px)',
            backgroundSize: '100% 4px'
          }} />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Glyph badge */}
            <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-orange-400/10 border border-cyan-400/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
              <span className="text-4xl font-black text-cyan-200">/ʊ/</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] text-orange-400 uppercase tracking-[0.2em] font-bold">New · Phase 1 Preview</span>
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white leading-tight mb-1.5">
                {language === 'it' ? 'Vocal Fitness Phonetic Lab' : 'Vocal Fitness Phonetic Lab'}
              </h3>
              <p className="text-cyan-200/80 text-sm sm:text-base leading-relaxed mb-3">
                {language === 'it'
                  ? 'Esplora la scheda interattiva del fonema /ʊ/ — anatomia, prosodia, audio del Prof. Steve Dapper.'
                  : 'Explore the interactive /ʊ/ phoneme card — anatomy, prosody, audio by Prof. Steve Dapper.'}
              </p>
              <div className="flex items-center gap-2 text-cyan-300 text-sm font-semibold group-hover:text-orange-300 transition-colors">
                <span>{language === 'it' ? 'Apri la scheda' : 'Open the card'}</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </a>

        {/* Breadcrumb when in folder */}
        {selectedFolder && (
          <div className="mb-6 flex items-center gap-2 text-slate-400">
            <button onClick={() => setSelectedFolder(null)} className="hover:text-white flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              {language === 'it' ? 'Torna alle cartelle' : 'Back to folders'}
            </button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white font-medium">{selectedFolder.name}</span>
          </div>
        )}

        {/* Folders Grid (when no folder selected) */}
        {!selectedFolder && folders.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Folder className="w-5 h-5 text-blue-400" />
              {language === 'it' ? 'Le tue Cartelle' : 'Your Folders'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder)}
                  className="bg-white/5 backdrop-blur rounded-xl border border-white/10 p-5 text-left hover:border-blue-500/50 hover:bg-white/10 transition-all group"
                  data-testid={`folder-${folder.id}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600/30 to-cyan-600/30 rounded-xl flex items-center justify-center group-hover:from-blue-600/50 group-hover:to-cyan-600/50 transition-all">
                      <Folder className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
                        {folder.name}
                      </h4>
                      <p className="text-sm text-slate-400">
                        {folder.content_count} {folder.content_count === 1 ? (language === 'it' ? 'contenuto' : 'content') : t.contentInFolder}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                  </div>
                  {folder.description && (
                    <p className="mt-3 text-sm text-slate-400 line-clamp-2">{folder.description}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content without folder (when no folder selected) */}
        {!selectedFolder && contentWithoutFolder.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-cyan-400" />
              {language === 'it' ? 'Altri Contenuti' : 'Other Content'}
            </h3>
          </div>
        )}

        {/* Content Grid */}
        {(selectedFolder || (!selectedFolder && contentWithoutFolder.length > 0)) && (
          <>
            {displayedContents.length === 0 ? (
              <div className="text-center py-16">
                <FolderOpen className="w-16 h-16 text-blue-400/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  {selectedFolder ? (language === 'it' ? 'Cartella vuota' : 'Empty folder') : t.noContent}
                </h3>
                <p className="text-blue-300/70">
                  {selectedFolder ? 'Non ci sono ancora contenuti in questa cartella.' : 'I contenuti verranno aggiunti presto.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedContents.map(content => (
                  <div
                    key={content.id}
                    className="bg-white/5 backdrop-blur rounded-xl border border-white/10 overflow-hidden hover:border-blue-500/50 transition-all group"
                    data-testid={`content-card-${content.id}`}
                  >
                    {/* Thumbnail */}
                    {content.thumbnail_url ? (
                      <div className="aspect-video bg-slate-800 overflow-hidden">
                        <img 
                          src={content.thumbnail_url} 
                          alt={content.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gradient-to-br from-blue-600/20 to-cyan-600/20 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-blue-600/30 flex items-center justify-center">
                          {getContentIcon(content.content_type)}
                        </div>
                      </div>
                    )}

                    {/* Content Info */}
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          content.content_type === 'video' ? 'bg-blue-500/20 text-blue-300' :
                          content.content_type === 'pdf' ? 'bg-green-500/20 text-green-300' :
                          content.content_type === 'audio' ? 'bg-purple-500/20 text-purple-300' :
                          'bg-cyan-500/20 text-cyan-300'
                        }`}>
                          {content.content_type.toUpperCase()}
                        </span>
                      </div>
                      
                      <h4 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-300 transition-colors">
                        {content.title}
                      </h4>
                      
                      {content.description && (
                        <p className="text-blue-200/70 text-sm mb-4 line-clamp-2">
                          {content.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        {getContentAction(content)}
                        <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Empty state when no folders and no content */}
        {!selectedFolder && folders.length === 0 && contentWithoutFolder.length === 0 && (
          <div className="text-center py-16">
            <FolderOpen className="w-16 h-16 text-blue-400/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Nessun contenuto disponibile
            </h3>
            <p className="text-blue-300/70">
              I contenuti verranno aggiunti presto. Torna a controllare!
            </p>
          </div>
        )}
      </div>

      {/* Content Modal - Different sizes based on content type */}
      {selectedContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-4" onClick={() => setSelectedContent(null)}>
          <div 
            className={`bg-slate-900 rounded-2xl overflow-hidden flex flex-col ${
              selectedContent.content_type === 'embed' 
                ? 'w-full h-full max-w-[95vw] max-h-[95vh]' 
                : 'max-w-4xl w-full max-h-[90vh]'
            }`} 
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg sm:text-xl font-bold text-white truncate pr-4">{selectedContent.title}</h3>
              <div className="flex items-center gap-2">
                {selectedContent.content_type === 'embed' && (
                  <a 
                    href={selectedContent.embed_code?.match(/src="([^"]+)"/)?.[1] || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-white p-2"
                    title={language === 'it' ? 'Apri in nuova finestra' : 'Open in new window'}
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                )}
                <Button onClick={() => setSelectedContent(null)} variant="ghost" className="text-white hover:bg-white/10 p-2">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            {/* Content Area */}
            <div className={`flex-1 overflow-auto ${selectedContent.content_type === 'embed' ? 'p-0' : 'p-4'}`}>
              {selectedContent.content_type === 'video' && (() => {
                const url = selectedContent.url || '';
                
                // Check if there's a custom embed code
                if (selectedContent.embed_code) {
                  return (
                    <div 
                      className="aspect-video [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:rounded-lg"
                      dangerouslySetInnerHTML={{ __html: selectedContent.embed_code }}
                    />
                  );
                }
                
                // Check if it's a YouTube video
                const videoId = getYouTubeVideoId(url);
                if (videoId) {
                  return (
                    <div className="aspect-video">
                      <iframe
                        className="w-full h-full rounded-lg"
                        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`}
                        title={selectedContent.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  );
                }
                
                // Check if it's a Google Drive video
                const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
                if (driveMatch) {
                  const fileId = driveMatch[1];
                  return (
                    <div className="aspect-video">
                      <iframe
                        className="w-full h-full rounded-lg"
                        src={`https://drive.google.com/file/d/${fileId}/preview`}
                        title={selectedContent.title}
                        frameBorder="0"
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                      />
                    </div>
                  );
                }
                
                // Regular video file - adaptive for both 16:9 and 9:16
                return (
                  <video controls autoPlay className="w-full max-h-[75vh] rounded-lg object-contain bg-black" src={url}>
                    {language === 'it' ? 'Il tuo browser non supporta la riproduzione video.' : 'Your browser does not support video playback.'}
                  </video>
                );
              })()}
              
              {selectedContent.content_type === 'audio' && (() => {
                const url = selectedContent.url || '';
                
                // Check if there's a custom embed code
                if (selectedContent.embed_code) {
                  return (
                    <div 
                      className="p-8 bg-slate-800 rounded-lg [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:rounded-lg"
                      dangerouslySetInnerHTML={{ __html: selectedContent.embed_code }}
                    />
                  );
                }
                
                // Check if it's a Google Drive audio
                const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
                if (driveMatch) {
                  const fileId = driveMatch[1];
                  return (
                    <div className="p-8 bg-slate-800 rounded-lg">
                      <div className="aspect-video max-h-[200px]">
                        <iframe
                          className="w-full h-full rounded-lg"
                          src={`https://drive.google.com/file/d/${fileId}/preview`}
                          title={selectedContent.title}
                          frameBorder="0"
                          allow="autoplay"
                        />
                      </div>
                      <p className="text-center text-slate-400 mt-4 text-sm">
                        {language === 'it' ? 'Usa i controlli nel player sopra' : 'Use the controls in the player above'}
                      </p>
                    </div>
                  );
                }
                
                // Regular audio file
                return (
                  <div className="p-8 bg-slate-800 rounded-lg">
                    <audio controls autoPlay className="w-full" src={url}>
                      {language === 'it' ? 'Il tuo browser non supporta la riproduzione audio.' : 'Your browser does not support audio playback.'}
                    </audio>
                  </div>
                );
              })()}
              
              {/* Embed type content - Full screen */}
              {selectedContent.content_type === 'embed' && selectedContent.embed_code && (
                <div 
                  className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0"
                  style={{ minHeight: 'calc(95vh - 80px)' }}
                  dangerouslySetInnerHTML={{ __html: selectedContent.embed_code }}
                />
              )}
              
              {selectedContent.description && (
                <p className="mt-4 text-blue-200">{selectedContent.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================== MESSAGES PANEL ===================== */}
      {showMessages && (
        <div className="fixed inset-0 z-[55] flex justify-end" data-testid="messages-panel">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowMessages(false)} />
          <div className="relative w-full max-w-md bg-slate-900 border-l border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-emerald-600/20 to-cyan-600/20">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">{language === 'it' ? 'Messaggi' : 'Messages'}</h3>
              </div>
              <button onClick={() => setShowMessages(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="client-messages">
              {chatMessages.length === 0 && (
                <p className="text-slate-500 text-center py-8">{language === 'it' ? 'Nessun messaggio' : 'No messages'}</p>
              )}
              {chatMessages.map(m => {
                const isMe = m.sender_id !== m.recipient_id && m.sender_name !== 'VocalFitness Admin' && m.recipient_id !== user?.id;
                const isAdmin = m.sender_id !== user?.id;
                // YouTube detection
                const getYouTubeId = (url) => {
                  if (!url) return null;
                  const patterns = [
                    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
                    /youtube\.com\/shorts\/([^"&?\/\s]{11})/i
                  ];
                  for (const p of patterns) {
                    const match = url.match(p);
                    if (match) return match[1];
                  }
                  return null;
                };
                const ytId = getYouTubeId(m.media_url);
                return (
                  <div key={m.id} className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isAdmin ? 'bg-slate-700 text-white' : 'bg-emerald-600 text-white'}`}>
                      {m.message_type === 'task' && (
                        <div className="flex items-center gap-2 text-xs font-medium mb-1.5 opacity-80">
                          <ClipboardList className="w-3 h-3" /> {language === 'it' ? 'Compito' : 'Task'}
                          {m.task_due_date && <span className="opacity-70">- {language === 'it' ? 'Scadenza' : 'Due'}: {m.task_due_date}</span>}
                        </div>
                      )}
                      {m.content && <p className="text-sm whitespace-pre-wrap">{m.content}</p>}
                      {m.task_description && <p className="text-sm mt-1 italic">{m.task_description}</p>}
                      
                      {/* Video - YouTube or direct */}
                      {m.media_url && m.message_type === 'video' && (
                        ytId ? (
                          <div className="mt-2 rounded-lg overflow-hidden aspect-video">
                            <iframe src={`https://www.youtube.com/embed/${ytId}`} className="w-full h-full min-h-[150px]" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Video" />
                          </div>
                        ) : (
                          <video controls className="mt-2 rounded-lg max-w-full max-h-40" src={m.media_url} />
                        )
                      )}
                      
                      {/* Audio */}
                      {m.media_url && m.message_type === 'audio' && (
                        <audio controls className="mt-2 w-full" src={m.media_url} />
                      )}
                      
                      {/* File/Document link */}
                      {m.media_url && m.message_type === 'file' && (
                        <a href={m.media_url} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                          <FileText className="w-4 h-4" />
                          <span className="text-sm underline">{m.file_name || m.media_url.split('/').pop() || (language === 'it' ? 'Apri documento' : 'Open document')}</span>
                          <ExternalLink className="w-3 h-3 ml-auto" />
                        </a>
                      )}
                      
                      {m.message_type === 'task' && isAdmin && !m.task_completed && (
                        <button onClick={() => handleCompleteTask(m.id)} className="mt-2 flex items-center gap-1.5 text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors">
                          <Check className="w-3 h-3" /> {language === 'it' ? 'Segna come completato' : 'Mark as completed'}
                        </button>
                      )}
                      {m.message_type === 'task' && m.task_completed && (
                        <p className="mt-1 text-xs text-green-300 flex items-center gap-1"><Check className="w-3 h-3" /> {language === 'it' ? 'Completato' : 'Completed'}</p>
                      )}
                      <p className="text-[10px] mt-1 opacity-40">{new Date(m.created_at).toLocaleString(language === 'it' ? 'it-IT' : 'en-US', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/10 flex gap-2">
              <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendClientMessage()} className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white" placeholder={language === 'it' ? 'Scrivi un messaggio...' : 'Write a message...'} data-testid="client-message-input" />
              <Button onClick={handleSendClientMessage} className="bg-emerald-600 hover:bg-emerald-700 px-4" data-testid="client-send-btn">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== POPUP MESSAGE MODAL ===================== */}
      {currentPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" data-testid="popup-overlay">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden border border-amber-500/30 shadow-2xl shadow-amber-500/10 animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()} data-testid="popup-modal">
            {/* Popup Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-amber-600/20 to-orange-600/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-lg font-bold text-white truncate" data-testid="popup-title">{currentPopup.title}</h3>
              </div>
              <button onClick={handleClosePopup} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors" data-testid="popup-close-button">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Popup Content */}
            <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4">
              {/* Text content */}
              {currentPopup.content && (
                <p className="text-slate-200 text-base leading-relaxed whitespace-pre-wrap" data-testid="popup-text-content">{currentPopup.content}</p>
              )}

              {/* Video content */}
              {currentPopup.message_type === 'video' && (() => {
                if (currentPopup.embed_code) {
                  return (
                    <div className="rounded-lg overflow-hidden [&>iframe]:w-full [&>iframe]:rounded-lg" style={{ maxHeight: '60vh' }} dangerouslySetInnerHTML={{ __html: currentPopup.embed_code }} />
                  );
                }
                const url = currentPopup.media_url || '';
                const videoId = getYouTubeVideoId(url);
                if (videoId) {
                  return (
                    <div className="relative w-full rounded-lg overflow-hidden" style={{ paddingBottom: '56.25%' }}>
                      <iframe className="absolute inset-0 w-full h-full" src={`https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0`} title={currentPopup.title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    </div>
                  );
                }
                if (url) {
                  return <video controls className="w-full max-h-[60vh] rounded-lg object-contain bg-black" src={url} />;
                }
                return null;
              })()}

              {/* Audio content */}
              {currentPopup.message_type === 'audio' && (() => {
                if (currentPopup.embed_code) {
                  return (
                    <div className="bg-slate-800 rounded-lg p-4 [&>iframe]:w-full [&>iframe]:rounded-lg" dangerouslySetInnerHTML={{ __html: currentPopup.embed_code }} />
                  );
                }
                const url = currentPopup.media_url || '';
                if (url) {
                  return (
                    <div className="bg-slate-800 rounded-lg p-4 flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <Volume2 className="w-6 h-6 text-purple-400" />
                      </div>
                      <audio controls className="w-full" src={url} />
                    </div>
                  );
                }
                return null;
              })()}

              {/* CTA Button */}
              {currentPopup.button_text && currentPopup.button_url && (
                <a href={currentPopup.button_url} target="_blank" rel="noopener noreferrer" className="block">
                  <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3" data-testid="popup-cta-button">
                    {currentPopup.button_text}
                  </Button>
                </a>
              )}
            </div>

            {/* Popup Footer */}
            <div className="p-4 border-t border-white/10 flex items-center justify-between gap-3">
              <button
                onClick={() => handleDismissPopup(currentPopup.id)}
                className="text-sm text-slate-400 hover:text-slate-200 transition-colors underline underline-offset-4"
                data-testid="popup-dismiss-button"
              >
                {language === 'it' ? 'Non mostrare più' : "Don't show again"}
              </button>
              <Button onClick={handleClosePopup} className="bg-slate-700 hover:bg-slate-600 text-white px-6" data-testid="popup-ok-button">
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembersAreaPage;

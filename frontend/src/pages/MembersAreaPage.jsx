import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  LogOut, Video, FileText, Music, Link as LinkIcon, 
  Loader2, Home, User, FolderOpen, ChevronRight,
  Play, Download, ExternalLink, Settings, KeyRound,
  Folder, ArrowLeft
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';

const MembersAreaPage = () => {
  const navigate = useNavigate();
  const { user, token, logout, isAdmin, loading: authLoading } = useAuth();
  const [contents, setContents] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState(null);

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

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getContentIcon = (type) => {
    switch (type) {
      case 'video': return <Video className="w-5 h-5" />;
      case 'pdf': return <FileText className="w-5 h-5" />;
      case 'audio': return <Music className="w-5 h-5" />;
      case 'link': return <LinkIcon className="w-5 h-5" />;
      default: return <FolderOpen className="w-5 h-5" />;
    }
  };

  const getContentAction = (content) => {
    switch (content.content_type) {
      case 'video':
        return (
          <Button onClick={() => setSelectedContent(content)} className="bg-blue-600 hover:bg-blue-700" data-testid={`play-${content.id}`}>
            <Play className="w-4 h-4 mr-2" /> Guarda
          </Button>
        );
      case 'pdf':
        return (
          <a href={content.url} target="_blank" rel="noopener noreferrer">
            <Button className="bg-green-600 hover:bg-green-700" data-testid={`download-${content.id}`}>
              <Download className="w-4 h-4 mr-2" /> Scarica
            </Button>
          </a>
        );
      case 'audio':
        return (
          <Button onClick={() => setSelectedContent(content)} className="bg-purple-600 hover:bg-purple-700" data-testid={`listen-${content.id}`}>
            <Play className="w-4 h-4 mr-2" /> Ascolta
          </Button>
        );
      case 'link':
        return (
          <a href={content.url} target="_blank" rel="noopener noreferrer">
            <Button className="bg-cyan-600 hover:bg-cyan-700" data-testid={`open-${content.id}`}>
              <ExternalLink className="w-4 h-4 mr-2" /> Apri
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
          <p className="text-blue-200">Caricamento contenuti...</p>
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
              <h1 className="text-white font-bold text-lg">Area Riservata</h1>
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
            Benvenuto, {user?.full_name || user?.username}! 👋
          </h2>
          <p className="text-blue-200">
            Accedi ai tuoi contenuti esclusivi per migliorare il tuo Business English.
          </p>
        </div>

        {/* Breadcrumb when in folder */}
        {selectedFolder && (
          <div className="mb-6 flex items-center gap-2 text-slate-400">
            <button onClick={() => setSelectedFolder(null)} className="hover:text-white flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Torna alle cartelle
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
              Le tue Cartelle
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
                        {folder.content_count} {folder.content_count === 1 ? 'contenuto' : 'contenuti'}
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
              Altri Contenuti
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
                  {selectedFolder ? 'Cartella vuota' : 'Nessun contenuto disponibile'}
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

      {/* Content Modal */}
      {selectedContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setSelectedContent(null)}>
          <div className="bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">{selectedContent.title}</h3>
              <Button onClick={() => setSelectedContent(null)} variant="ghost" className="text-white hover:bg-white/10">✕</Button>
            </div>
            <div className="p-4">
              {selectedContent.content_type === 'video' && (
                (() => {
                  // Check if it's a YouTube video
                  const youtubeMatch = selectedContent.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
                  if (youtubeMatch) {
                    const videoId = youtubeMatch[1];
                    return (
                      <div className="aspect-video">
                        <iframe
                          className="w-full h-full rounded-lg"
                          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                          title={selectedContent.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    );
                  }
                  // Regular video file
                  return (
                    <video controls autoPlay className="w-full rounded-lg" src={selectedContent.url}>
                      Il tuo browser non supporta la riproduzione video.
                    </video>
                  );
                })()
              )}
              {selectedContent.content_type === 'audio' && (
                <div className="p-8 bg-slate-800 rounded-lg">
                  <audio controls autoPlay className="w-full" src={selectedContent.url}>
                    Il tuo browser non supporta la riproduzione audio.
                  </audio>
                </div>
              )}
              {selectedContent.description && (
                <p className="mt-4 text-blue-200">{selectedContent.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembersAreaPage;

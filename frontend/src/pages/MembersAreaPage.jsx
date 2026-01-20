import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  LogOut, Video, FileText, Music, Link as LinkIcon, 
  Loader2, Home, User, FolderOpen, ChevronRight,
  Play, Download, ExternalLink, Settings, KeyRound
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';

const MembersAreaPage = () => {
  const navigate = useNavigate();
  const { user, token, logout, isAdmin, loading: authLoading } = useAuth();
  const [contents, setContents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState(null);

  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Fetch content
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      
      try {
        const [contentRes, categoriesRes] = await Promise.all([
          axios.get(`${backendUrl}/api/members/content`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${backendUrl}/api/members/categories`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        setContents(contentRes.data);
        setCategories(categoriesRes.data.categories || []);
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
          <Button
            onClick={() => setSelectedContent(content)}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid={`play-${content.id}`}
          >
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
          <Button
            onClick={() => setSelectedContent(content)}
            className="bg-purple-600 hover:bg-purple-700"
            data-testid={`listen-${content.id}`}
          >
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

  const filteredContents = selectedCategory 
    ? contents.filter(c => c.category === selectedCategory)
    : contents;

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
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-blue-200">
              <User className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">{user?.full_name || user?.username}</span>
            </div>
            
            {isAdmin() && (
              <Button
                onClick={() => navigate('/admin')}
                variant="outline"
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
                data-testid="admin-panel-button"
              >
                <Settings className="w-4 h-4 mr-2" /> Admin
              </Button>
            )}
            
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Home className="w-4 h-4 mr-2" /> Home
            </Button>
            
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-red-400/50 text-red-400 hover:bg-red-500/20"
              data-testid="logout-button"
            >
              <LogOut className="w-4 h-4 mr-2" /> Esci
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

        {/* Category Filters */}
        {categories.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Categorie</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setSelectedCategory(null)}
                variant={selectedCategory === null ? 'default' : 'outline'}
                className={selectedCategory === null 
                  ? 'bg-blue-600' 
                  : 'border-white/20 text-white hover:bg-white/10'}
                data-testid="category-all"
              >
                Tutti
              </Button>
              {categories.map(cat => (
                <Button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  className={selectedCategory === cat 
                    ? 'bg-blue-600' 
                    : 'border-white/20 text-white hover:bg-white/10'}
                  data-testid={`category-${cat}`}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Content Grid */}
        {filteredContents.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="w-16 h-16 text-blue-400/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Nessun contenuto disponibile
            </h3>
            <p className="text-blue-300/70">
              I contenuti verranno aggiunti presto. Torna a controllare!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContents.map(content => (
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
                    {content.category && (
                      <span className="px-2 py-1 rounded text-xs bg-white/10 text-white/70">
                        {content.category}
                      </span>
                    )}
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
      </div>

      {/* Content Modal */}
      {selectedContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setSelectedContent(null)}>
          <div className="bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">{selectedContent.title}</h3>
              <Button
                onClick={() => setSelectedContent(null)}
                variant="ghost"
                className="text-white hover:bg-white/10"
              >
                ✕
              </Button>
            </div>
            <div className="p-4">
              {selectedContent.content_type === 'video' && (
                <video 
                  controls 
                  autoPlay
                  className="w-full rounded-lg"
                  src={selectedContent.url}
                >
                  Il tuo browser non supporta la riproduzione video.
                </video>
              )}
              {selectedContent.content_type === 'audio' && (
                <div className="p-8 bg-slate-800 rounded-lg">
                  <audio 
                    controls 
                    autoPlay
                    className="w-full"
                    src={selectedContent.url}
                  >
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

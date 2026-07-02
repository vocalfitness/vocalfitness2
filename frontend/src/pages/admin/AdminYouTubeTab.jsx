import React from 'react';
import {
  Plus, Youtube, Loader2, RefreshCw, UserCheck, Trash2, Eye, EyeOff, Folder, ExternalLink,
} from 'lucide-react';
import { Button } from '../../components/ui/button';

/**
 * AdminYouTubeTab — imported YouTube playlists + sync/edit/delete actions.
 *
 * Props:
 *   language, t, youtubePlaylists
 *   youtubeSyncing  — id | 'all' | null (spinner target)
 *   handleSyncAllPlaylists / handleSyncPlaylist / handleDeleteYoutubePlaylist
 *   setFormData / setShowModal / setEditItem — for import / edit-users modal
 */
export const AdminYouTubeTab = ({
  language,
  t,
  youtubePlaylists,
  youtubeSyncing,
  handleSyncAllPlaylists,
  handleSyncPlaylist,
  handleDeleteYoutubePlaylist,
  setFormData,
  setShowModal,
  setEditItem,
}) => {
  return (
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
              {youtubeSyncing === 'all'
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <RefreshCw className="w-4 h-4 mr-2" />}
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
                    variant="ghost" size="sm"
                    className="text-amber-400 hover:bg-amber-500/20"
                    title="Sincronizza"
                  >
                    {youtubeSyncing === playlist.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <RefreshCw className="w-4 h-4" />}
                  </Button>
                  <Button
                    onClick={() => { setEditItem(playlist); setFormData({ assigned_users: playlist.assigned_users || [] }); setShowModal('edit-youtube-users'); }}
                    variant="ghost" size="sm"
                    className="text-blue-400 hover:bg-blue-500/20"
                    title={language === 'it' ? 'Modifica utenti' : 'Edit users'}
                  >
                    <UserCheck className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleDeleteYoutubePlaylist(playlist.id, true)}
                    variant="ghost" size="sm"
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
  );
};

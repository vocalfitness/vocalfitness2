import React from 'react';
import {
  Plus, FolderOpen, Loader2, RefreshCw, Edit, Trash2,
} from 'lucide-react';
import { Button } from '../../components/ui/button';

/**
 * AdminContentTab — content (video/audio/pdf/link) table + actions.
 *
 * Props:
 *   language, contents
 *   getContentIcon             — (contentType) => React node
 *   regeneratingThumbs / regeneratingThumbId — spinner flags
 *   handleRegenerateAllThumbnails / handleRegenerateThumbnail
 *   setFormData / setShowModal / setEditItem — for create/edit modal
 *   handleDeleteContent
 */
export const AdminContentTab = ({
  language,
  contents,
  getContentIcon,
  regeneratingThumbs,
  regeneratingThumbId,
  handleRegenerateAllThumbnails,
  handleRegenerateThumbnail,
  setFormData,
  setShowModal,
  setEditItem,
  handleDeleteContent,
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-white">Gestione Contenuti</h2>
        <div className="flex gap-2">
          <Button
            onClick={handleRegenerateAllThumbnails}
            disabled={regeneratingThumbs}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            data-testid="regenerate-all-thumbnails"
          >
            {regeneratingThumbs ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            {language === 'it' ? 'Rigenera anteprime' : 'Regenerate thumbnails'}
          </Button>
          <Button
            onClick={() => { setFormData({ content_type: 'video', is_public: true, assigned_users: [], order: 0 }); setShowModal('create-content'); }}
            className="bg-green-600 hover:bg-green-700"
            data-testid="add-content-button"
          >
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
                      <Button
                        onClick={() => handleRegenerateThumbnail(content.id)}
                        variant="ghost" size="sm"
                        className="text-emerald-400 hover:bg-emerald-500/20"
                        disabled={regeneratingThumbId === content.id}
                        data-testid={`regen-thumb-${content.id}`}
                        title={language === 'it' ? 'Rigenera anteprima' : 'Regenerate thumbnail'}
                      >
                        {regeneratingThumbId === content.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      </Button>
                      <Button
                        onClick={() => { setEditItem(content); setFormData(content); setShowModal('edit-content'); }}
                        variant="ghost" size="sm" className="text-blue-400 hover:bg-blue-500/20"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteContent(content.id)}
                        variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/20"
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
  );
};

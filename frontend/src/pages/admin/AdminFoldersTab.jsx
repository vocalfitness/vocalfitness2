import React from 'react';
import {
  Plus, Folder, Edit, Trash2, Eye, EyeOff, UserCheck,
} from 'lucide-react';
import { Button } from '../../components/ui/button';

/**
 * AdminFoldersTab — folder management grid.
 *
 * Presentational only. All CRUD state (modal, form data, edit item)
 * lives at parent level so a modal opened here can still resolve the
 * correct submit handler.
 */
export const AdminFoldersTab = ({
  language,
  t,
  folders,
  setFormData,
  setShowModal,
  setEditItem,
  handleDeleteFolder,
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-white">{language === 'it' ? 'Gestione Cartelle' : 'Folder Management'}</h2>
        <Button
          onClick={() => { setFormData({ is_public: true, assigned_users: [], order: 0 }); setShowModal('create-folder'); }}
          className="bg-green-600 hover:bg-green-700"
          data-testid="add-folder-button"
        >
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
                  <Button
                    onClick={() => { setEditItem(folder); setFormData(folder); setShowModal('edit-folder'); }}
                    variant="ghost" size="sm" className="text-blue-400 hover:bg-blue-500/20"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleDeleteFolder(folder.id)}
                    variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/20"
                  >
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
  );
};

import React from 'react';
import {
  Plus, MessageSquare, Eye, EyeOff, Power, PowerOff, Edit, Trash2,
} from 'lucide-react';
import { Button } from '../../components/ui/button';

/**
 * AdminPopupsTab — list + inline actions for popup broadcast messages.
 *
 * All heavy state (list, stats, create/edit modal) lives at parent level.
 * This component only renders the list and dispatches to callbacks.
 *
 * Props contract:
 *   language              — 'it' | 'en'
 *   t                     — translations dict (parent-provided)
 *   popupMessages         — array of popup docs
 *   popupStats            — { [id]: { views, dismissals, audience, view_rate, dismiss_rate } }
 *   setFormData           — parent form state setter (used by "New popup")
 *   setShowModal          — opens the create/edit modal
 *   setEditItem           — sets which popup is being edited
 *   handleTogglePopupActive — (popup) toggle is_active
 *   handleDeletePopup     — (popupId) delete
 */
export const AdminPopupsTab = ({
  language,
  t,
  popupMessages,
  popupStats,
  setFormData,
  setShowModal,
  setEditItem,
  handleTogglePopupActive,
  handleDeletePopup,
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-white">{t.popupMessages}</h2>
        <Button
          onClick={() => { setFormData({ message_type: 'text', target_users: [], is_active: true, popupMediaOption: 'link' }); setShowModal('create-popup'); }}
          className="bg-amber-600 hover:bg-amber-700"
          data-testid="add-popup-button"
        >
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
            <div
              key={popup.id}
              className={`bg-slate-800 rounded-xl border p-5 ${popup.is_active ? 'border-amber-500/30' : 'border-slate-700 opacity-60'}`}
              data-testid={`popup-card-${popup.id}`}
            >
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
                  <Button
                    onClick={() => handleTogglePopupActive(popup)}
                    variant="ghost" size="sm"
                    className={popup.is_active ? 'text-green-400 hover:text-green-300' : 'text-slate-500 hover:text-slate-400'}
                    data-testid={`toggle-popup-${popup.id}`}
                  >
                    {popup.is_active ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                  </Button>
                  <Button
                    onClick={() => { setEditItem(popup); setFormData({ ...popup, popupMediaOption: popup.media_url ? 'link' : 'link' }); setShowModal('edit-popup'); }}
                    variant="ghost" size="sm"
                    className="text-blue-400 hover:text-blue-300"
                    data-testid={`edit-popup-${popup.id}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleDeletePopup(popup.id)}
                    variant="ghost" size="sm"
                    className="text-red-400 hover:text-red-300"
                    data-testid={`delete-popup-${popup.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

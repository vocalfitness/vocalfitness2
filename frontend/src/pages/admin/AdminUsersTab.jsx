import React from 'react';
import { Plus, Send, Edit, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';

/**
 * AdminUsersTab — user list with role/type badges + inline actions.
 *
 * Props:
 *   language, t, users
 *   setFormData / setShowModal / setEditItem — for create/edit modal
 *   openChat / setActiveTab / fetchConversations — "Send message" shortcut
 *   handleDeleteUser
 */
export const AdminUsersTab = ({
  language,
  t,
  users,
  setFormData,
  setShowModal,
  setEditItem,
  openChat,
  setActiveTab,
  fetchConversations,
  handleDeleteUser,
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-white">{language === 'it' ? 'Gestione Utenti' : 'User Management'}</h2>
        <Button
          onClick={() => { setFormData({ role: 'client' }); setShowModal('create-user'); }}
          className="bg-green-600 hover:bg-green-700"
          data-testid="add-user-button"
        >
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
                  <span className="text-xs text-slate-400">
                    {u.client_type === 'business' ? '🏢' : u.client_type === 'foreign' ? '🌍' : '👤'}{' '}
                    {u.client_type === 'business' ? (language === 'it' ? 'Business' : 'Business') :
                     u.client_type === 'foreign' ? (language === 'it' ? 'Estero' : 'Foreign') :
                     (language === 'it' ? 'Privato' : 'Private')}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-1 justify-end">
                    {!['admin', 'manager', 'editor'].includes(u.role) && (
                      <Button
                        onClick={() => { openChat(u.id); setActiveTab('messaging'); fetchConversations(); }}
                        variant="ghost" size="sm"
                        className="text-emerald-400 hover:bg-emerald-500/20"
                        title={language === 'it' ? 'Messaggi' : 'Messages'}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      onClick={() => { setEditItem(u); setFormData({...u}); setShowModal('edit-user'); }}
                      variant="ghost" size="sm"
                      className="text-blue-400 hover:bg-blue-500/20"
                      data-testid={`edit-user-${u.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {u.username !== 'admin' && (
                      <Button
                        onClick={() => handleDeleteUser(u.id)}
                        variant="ghost" size="sm"
                        className="text-red-400 hover:bg-red-500/20"
                      >
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
  );
};

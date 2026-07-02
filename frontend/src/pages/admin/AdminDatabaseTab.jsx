import React from 'react';

/**
 * AdminDatabaseTab — MongoDB stats dashboard.
 *
 * Pure presentational — reads ``databaseStats`` fetched at parent level.
 */
export const AdminDatabaseTab = ({ databaseStats }) => {
  if (!databaseStats) return null;

  return (
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
  );
};

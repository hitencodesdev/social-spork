import React from 'react';
import { History, CheckCircle, AlertTriangle, FileSpreadsheet, Calendar } from 'lucide-react';

export default function SyncHistoryTable({ history = [], onRefresh, isLoading }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <History className="w-5 h-5 text-emerald-400" />
            <span>Master Sheet Synchronization Audit Trail</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit logs of weekly Google Sheets and Excel synchronization batches.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase font-semibold tracking-wider">
            <tr>
              <th className="py-3 px-4">Date / Source</th>
              <th className="py-3 px-4">Triggered By</th>
              <th className="py-3 px-4">Rows Processed</th>
              <th className="py-3 px-4">Created / Updated</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Validation Warnings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {history.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No synchronization history available yet.
                </td>
              </tr>
            ) : (
              history.map((h) => (
                <tr key={h._id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-medium text-slate-200">
                    <div className="flex items-center space-x-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>{h.fileName || h.syncType}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(h.startedAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono">{h.triggeredBy}</td>
                  <td className="py-3.5 px-4 font-bold text-white">{h.totalRowsRead} rows</td>
                  <td className="py-3.5 px-4">
                    <span className="text-emerald-400 font-semibold">{h.recordsCreated} new</span>
                    <span className="text-slate-500"> / </span>
                    <span className="text-sky-400 font-semibold">{h.recordsUpdated} updated</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        h.status === 'SUCCESS'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      <CheckCircle className="w-3 h-3" />
                      <span>{h.status}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {h.validationErrors && h.validationErrors.length > 0 ? (
                      <span className="text-amber-400 font-semibold">
                        ⚠️ {h.validationErrors.length} warnings
                      </span>
                    ) : (
                      <span className="text-slate-500">None</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

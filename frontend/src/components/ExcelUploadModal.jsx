import React, { useState } from 'react';
import { X, UploadCloud, FileSpreadsheet, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import api from '../services/api';

export default function ExcelUploadModal({ onClose, onSyncComplete }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select an Excel or CSV file to upload.');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const data = await api.uploadExcelSync(file);
      setResult(data);
      if (onSyncComplete) onSyncComplete();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to upload and process Excel file');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Synchronize Restaurant Master</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 text-xs text-slate-300 space-y-1.5">
            <p className="font-semibold text-emerald-400">⚡ Safe Weekly Synchronization Rules:</p>
            <ul className="list-disc pl-4 space-y-1 text-slate-400">
              <li>Existing WhatsApp contact numbers are <strong className="text-white">preserved automatically</strong>.</li>
              <li>Outlets are matched against Z-RID (Zomato) and S-RID (Swiggy).</li>
              <li>Duplicates and invalid phone formats are caught and audited.</li>
            </ul>
          </div>

          {!result ? (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-slate-700 hover:border-slate-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-slate-950/40">
                <UploadCloud className="w-10 h-10 text-slate-400 mb-2" />
                <span className="text-sm font-semibold text-slate-200">
                  {file ? file.name : 'Click to select or drag & drop Excel file'}
                </span>
                <span className="text-xs text-slate-500 mt-1">Accepts .xlsx, .xls, or .csv</span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400">
                  {error}
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={isUploading || !file}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg transition"
              >
                {isUploading ? 'Parsing & Upserting...' : 'Start Weekly Synchronization'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-xs text-emerald-400 flex items-center space-x-3">
                <CheckCircle className="w-6 h-6 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">Synchronization Successful!</h4>
                  <p className="text-emerald-300 mt-0.5">{result.message}</p>
                </div>
              </div>

              {result.data?.summary && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                    <span className="text-slate-400">Rows Read:</span>
                    <p className="font-bold text-white text-base mt-1">{result.data.summary.totalRowsRead}</p>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                    <span className="text-slate-400">Records Updated:</span>
                    <p className="font-bold text-emerald-400 text-base mt-1">{result.data.summary.recordsUpdated}</p>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                    <span className="text-slate-400">New Outlets Added:</span>
                    <p className="font-bold text-sky-400 text-base mt-1">{result.data.summary.recordsCreated}</p>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                    <span className="text-slate-400">Validation Warnings:</span>
                    <p className="font-bold text-amber-400 text-base mt-1">{result.data.summary.errorsCount}</p>
                  </div>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

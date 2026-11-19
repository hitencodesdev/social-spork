import React from 'react';
import { X, CheckCircle, Clock, AlertOctagon, Phone, Calendar, Hash, ExternalLink, ShieldCheck } from 'lucide-react';

export default function ComplaintDetailModal({ complaint, onClose, onRetry }) {
  if (!complaint) return null;

  const isSwiggy = complaint.platform === 'SWIGGY';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div className="flex items-center space-x-3">
            <span
              className={`px-2.5 py-1 rounded text-xs font-bold tracking-wider uppercase ${
                isSwiggy
                  ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {complaint.platform}
            </span>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Order #{complaint.orderId}</span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {isSwiggy ? 'Swiggy RID (S-RID): ' : 'Zomato RID (Z-RID): '}
                <span className="text-white font-semibold">{complaint.platformRestaurantId}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Restaurant Target Card */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Target Restaurant Outlet
                </span>
                <h4 className="text-sm font-bold text-white mt-1">
                  {complaint.restaurantName || complaint.restaurant?.name || 'Unmapped Outlet'}
                </h4>
                <div className="text-xs text-slate-300 mt-1 flex items-center space-x-3">
                  <span>City: {complaint.restaurant?.city || 'Bengaluru'}</span>
                  <span>•</span>
                  <span>Subzone: {complaint.restaurant?.subzone || 'Indiranagar'}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Registered WhatsApp
                </span>
                <div className="text-sm font-mono font-bold text-emerald-400 mt-1 flex items-center justify-end space-x-1">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{complaint.restaurant?.whatsAppNumber || 'Not configured'}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {complaint.restaurant?.whatsAppContactName || 'Store Manager'}
                </div>
              </div>
            </div>
          </div>

          {/* Complaint Issue Details */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Complaint Breakdown
            </h4>
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500">Category:</span>
                  <p className="font-semibold text-slate-200 mt-0.5">{complaint.category || 'General'}</p>
                </div>
                <div>
                  <span className="text-slate-500">Specific Issue:</span>
                  <p className="font-semibold text-rose-400 mt-0.5">{complaint.issue || 'Food quality dispute'}</p>
                </div>
              </div>

              <div className="text-xs">
                <span className="text-slate-500">Item Affected:</span>
                <p className="font-semibold text-slate-200 mt-0.5">{complaint.productName || 'Order item'}</p>
              </div>

              <div className="text-xs">
                <span className="text-slate-500">Customer Description:</span>
                <p className="text-slate-300 bg-slate-900 p-3 rounded-lg border border-slate-800 italic mt-1">
                  "{complaint.customerDescription || 'No description provided by customer.'}"
                </p>
              </div>
            </div>
          </div>

          {/* Customer Uploaded Photos */}
          {complaint.imageUrls && complaint.imageUrls.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Customer Uploaded Evidence ({complaint.imageUrls.length})</span>
                <span className="text-[11px] text-emerald-400 font-normal">Buffered for WhatsApp delivery</span>
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {complaint.imageUrls.map((url, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-800 bg-black">
                    <img
                      src={url}
                      alt={`Customer proof ${idx + 1}`}
                      className="w-full h-44 object-cover hover:scale-105 transition duration-300"
                    />
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute bottom-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-lg text-xs flex items-center space-x-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>View</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deduplication & Audit Fingerprint */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 text-xs font-mono space-y-1.5">
            <div className="flex items-center space-x-2 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-slate-300">Deduplication Fingerprint (SHA-256):</span>
            </div>
            <p className="text-slate-500 break-all select-all">{complaint.dedupKey}</p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between sticky bottom-0">
          <div className="text-xs text-slate-400">
            Status: <span className="font-semibold text-white">{complaint.processingStatus}</span>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
            >
              Close
            </button>
            <button
              onClick={() => onRetry(complaint._id)}
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-md transition"
            >
              Re-send WhatsApp Alert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

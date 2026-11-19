import React, { useState } from 'react';
import { Search, Filter, RotateCw, Eye, Image as ImageIcon, CheckCircle, Clock, AlertTriangle, AlertOctagon } from 'lucide-react';

export default function ComplaintTable({ complaints = [], onSelectComplaint, onRetry, isLoading, onRefresh }) {
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = complaints.filter(c => {
    if (platformFilter && c.platform !== platformFilter) return false;
    if (statusFilter && c.processingStatus !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchOrder = c.orderId && c.orderId.toLowerCase().includes(q);
      const matchRest = c.restaurantName && c.restaurantName.toLowerCase().includes(q);
      const matchItem = c.productName && c.productName.toLowerCase().includes(q);
      const matchIssue = c.issue && c.issue.toLowerCase().includes(q);
      const matchRid = c.platformRestaurantId && c.platformRestaurantId.includes(q);
      return matchOrder || matchRest || matchItem || matchIssue || matchRid;
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DELIVERED':
      case 'READ':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-3 h-3" />
            <span>Delivered</span>
          </span>
        );
      case 'SENT':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Clock className="w-3 h-3" />
            <span>Sent (In-transit)</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertOctagon className="w-3 h-3" />
            <span>Failed</span>
          </span>
        );
      case 'UNMATCHED_RESTAURANT':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            <span>Unmatched RID</span>
          </span>
        );
      case 'MISSING_PHONE':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            <span>No Phone Mapped</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            <Clock className="w-3 h-3" />
            <span>{status || 'Pending'}</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Table Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <span>Incoming Complaints & WhatsApp Log</span>
            <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full font-normal">
              {filtered.length} total
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Auto-matched via Z-RID / S-RID and dispatched to individual restaurant WhatsApp numbers.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Order ID, RID, Item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-800 text-xs text-white pl-9 pr-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-orange-500 w-52 placeholder-slate-500"
            />
          </div>

          {/* Platform filter */}
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="bg-slate-800 text-xs text-white px-2.5 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-orange-500"
          >
            <option value="">All Platforms</option>
            <option value="SWIGGY">Swiggy</option>
            <option value="ZOMATO">Zomato</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 text-xs text-white px-2.5 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-orange-500"
          >
            <option value="">All Statuses</option>
            <option value="DELIVERED">Delivered</option>
            <option value="SENT">Sent</option>
            <option value="FAILED">Failed</option>
            <option value="UNMATCHED_RESTAURANT">Unmatched RID</option>
            <option value="MISSING_PHONE">Missing Phone</option>
          </select>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
            title="Refresh list"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase font-semibold tracking-wider">
            <tr>
              <th className="py-3 px-4">Platform / Order</th>
              <th className="py-3 px-4">Restaurant Matching</th>
              <th className="py-3 px-4">Complaint Details</th>
              <th className="py-3 px-4">Customer Photos</th>
              <th className="py-3 px-4">WhatsApp Delivery</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No complaints found matching current filters.
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const isSwiggy = c.platform === 'SWIGGY';
                return (
                  <tr key={c._id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Platform & Order */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                            isSwiggy
                              ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {c.platform}
                        </span>
                        <span className="font-mono font-semibold text-white">{c.orderId}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {new Date(c.ingestedAt || c.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>

                    {/* Restaurant Matching */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-medium text-slate-200">
                        {c.restaurantName || c.restaurant?.name || (
                          <span className="text-amber-400 font-semibold italic">Unmapped Outlet</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {isSwiggy ? 'S-RID: ' : 'Z-RID: '}
                        <span className="text-slate-300 font-semibold">{c.platformRestaurantId}</span>
                      </div>
                    </td>

                    {/* Complaint Details */}
                    <td className="py-3.5 px-4 align-top max-w-xs">
                      <div className="font-semibold text-slate-200 truncate">{c.issue || c.category}</div>
                      <div className="text-[11px] text-slate-400 truncate">{c.productName}</div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 italic mt-0.5">
                        "{c.customerDescription || 'No remarks'}"
                      </p>
                    </td>

                    {/* Customer Photos */}
                    <td className="py-3.5 px-4 align-top">
                      {c.imageUrls && c.imageUrls.length > 0 ? (
                        <div className="flex items-center space-x-1.5">
                          <div className="relative group cursor-pointer" onClick={() => onSelectComplaint(c)}>
                            <img
                              src={c.imageUrls[0]}
                              alt="Complaint proof"
                              className="w-10 h-10 rounded-lg object-cover border border-slate-700 bg-slate-800"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                            {c.imageUrls.length > 1 && (
                              <span className="absolute -bottom-1 -right-1 bg-slate-900 text-slate-300 text-[10px] font-bold px-1 rounded-full border border-slate-700">
                                +{c.imageUrls.length - 1}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {c.imageUrls.length} {c.imageUrls.length === 1 ? 'photo' : 'photos'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">No photos</span>
                      )}
                    </td>

                    {/* WhatsApp Delivery Status */}
                    <td className="py-3.5 px-4 align-top">
                      <div>{getStatusBadge(c.processingStatus)}</div>
                      {c.failureReason && (
                        <p className="text-[10px] text-rose-400 mt-1 max-w-xs truncate" title={c.failureReason}>
                          {c.failureReason}
                        </p>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 align-top text-right space-x-2">
                      <button
                        onClick={() => onSelectComplaint(c)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition"
                        title="View Details & Photos"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {(c.processingStatus === 'FAILED' ||
                        c.processingStatus === 'MISSING_PHONE' ||
                        c.processingStatus === 'UNMATCHED_RESTAURANT') && (
                        <button
                          onClick={() => onRetry(c._id)}
                          className="px-2.5 py-1 text-[11px] font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/20 transition"
                          title="Retry WhatsApp Dispatch"
                        >
                          Retry
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

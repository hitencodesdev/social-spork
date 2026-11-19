import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, Utensils, PhoneCall, AlertCircle } from 'lucide-react';

export default function StatCards({ metrics = {} }) {
  const {
    totalComplaints = 0,
    swiggyCount = 0,
    zomatoCount = 0,
    deliveredCount = 0,
    sentCount = 0,
    failedCount = 0,
    pendingCount = 0,
    needsAttentionCount = 0,
    deliveryRate = 100,
    totalRestaurants = 0,
    missingPhoneRestaurants = 0
  } = metrics;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Complaints */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Complaints</span>
          <span className="p-2 bg-slate-800 text-slate-300 rounded-lg">
            <Utensils className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-white">{totalComplaints}</span>
          <span className="text-xs text-slate-400">total received</span>
        </div>
        <div className="mt-3 flex items-center space-x-3 text-xs">
          <span className="text-orange-400 font-medium">Swiggy: {swiggyCount}</span>
          <span className="text-slate-600">•</span>
          <span className="text-rose-400 font-medium">Zomato: {zomatoCount}</span>
        </div>
      </div>

      {/* WhatsApp Delivery Success */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">WhatsApp Forwarded</span>
          <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-emerald-400">{deliveredCount + sentCount}</span>
          <span className="text-xs text-emerald-500/80 font-semibold">{deliveryRate}% success rate</span>
        </div>
        <div className="mt-3 flex items-center space-x-3 text-xs text-slate-400">
          <span>{deliveredCount} Delivered</span>
          <span>•</span>
          <span>{sentCount} In-transit</span>
        </div>
      </div>

      {/* Failed / Pending Alert */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Needs Attention</span>
          <span className="p-2 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20">
            <AlertCircle className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-rose-400">{failedCount + needsAttentionCount}</span>
          <span className="text-xs text-slate-400">requiring review</span>
        </div>
        <div className="mt-3 flex items-center space-x-3 text-xs text-slate-400">
          <span className="text-rose-400">{failedCount} Failed Dispatch</span>
          <span>•</span>
          <span className="text-amber-400">{needsAttentionCount} Unmapped/Missing</span>
        </div>
      </div>

      {/* Restaurant Master Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">Managed Restaurants</span>
          <span className="p-2 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20">
            <PhoneCall className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-sky-400">{totalRestaurants}</span>
          <span className="text-xs text-slate-400">active outlets</span>
        </div>
        <div className="mt-3 flex items-center space-x-2 text-xs">
          {missingPhoneRestaurants > 0 ? (
            <span className="text-amber-400 font-medium">⚠️ {missingPhoneRestaurants} missing WhatsApp #</span>
          ) : (
            <span className="text-emerald-400 font-medium">✓ 100% WhatsApp Numbers Mapped</span>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Search, Plus, Download, Phone, Check, Edit2, AlertTriangle, Building, MapPin } from 'lucide-react';

export default function RestaurantTable({
  restaurants = [],
  onUpdateRestaurant,
  onOpenAddModal,
  onDownloadTemplate,
  isLoading
}) {
  const [search, setSearch] = useState('');
  const [filterMissing, setFilterMissing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingPhone, setEditingPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const filtered = restaurants.filter((r) => {
    if (filterMissing && r.whatsAppNumber) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = r.name && r.name.toLowerCase().includes(q);
      const matchZ = r.zRid && r.zRid.includes(q);
      const matchS = r.sRid && r.sRid.includes(q);
      const matchCity = r.city && r.city.toLowerCase().includes(q);
      const matchPhone = r.whatsAppNumber && r.whatsAppNumber.includes(q);
      return matchName || matchZ || matchS || matchCity || matchPhone;
    }
    return true;
  });

  const handleStartEdit = (restaurant) => {
    setEditingId(restaurant._id);
    setEditingPhone(restaurant.whatsAppNumber || '');
    setPhoneError('');
  };

  const handleSavePhone = async (restaurantId) => {
    // Basic phone validation
    const cleaned = editingPhone.replace(/[\s\-\(\)\.]/g, '');
    if (cleaned && !/^\+?[0-9]{10,15}$/.test(cleaned)) {
      setPhoneError('Please enter a valid 10-digit mobile number or +E.164 format');
      return;
    }

    try {
      await onUpdateRestaurant(restaurantId, { whatsAppNumber: editingPhone });
      setEditingId(null);
      setPhoneError('');
    } catch (err) {
      setPhoneError(err.response?.data?.error || 'Failed to update phone number');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Controls Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <span>Restaurant Master Directory</span>
            <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full font-normal">
              {filtered.length} outlets
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Z-RID & S-RID mappings to individual restaurant WhatsApp numbers. Updated weekly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Name, Z-RID, S-RID, City..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-800 text-xs text-white pl-9 pr-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-sky-500 w-56 placeholder-slate-500"
            />
          </div>

          {/* Missing Phone Toggle */}
          <button
            onClick={() => setFilterMissing(!filterMissing)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              filterMissing
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            ⚠️ Missing Phone Only
          </button>

          {/* Download Sample */}
          <button
            onClick={onDownloadTemplate}
            className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
            title="Download Sample Master Excel Template"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Add Restaurant */}
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Outlet</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase font-semibold tracking-wider">
            <tr>
              <th className="py-3 px-4">Restaurant Outlet</th>
              <th className="py-3 px-4">Platform IDs (Z-RID & S-RID)</th>
              <th className="py-3 px-4">Location</th>
              <th className="py-3 px-4">Registered WhatsApp #</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No restaurants found matching search criteria.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const isEditing = editingId === r._id;
                const hasPhone = !!r.whatsAppNumber;

                return (
                  <tr key={r._id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white flex items-center space-x-2">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>{r.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Manager: {r.whatsAppContactName || 'N/A'}
                      </div>
                    </td>

                    {/* Platform IDs */}
                    <td className="py-3.5 px-4 font-mono text-[11px] space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-bold">
                          S-RID
                        </span>
                        <span className="text-slate-200 font-semibold">{r.sRid || '—'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                          Z-RID
                        </span>
                        <span className="text-slate-200 font-semibold">{r.zRid || '—'}</span>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{r.city || 'Unknown'}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 ml-4.5">{r.subzone || '—'}</div>
                    </td>

                    {/* Registered WhatsApp */}
                    <td className="py-3.5 px-4">
                      {isEditing ? (
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1.5">
                            <input
                              type="text"
                              value={editingPhone}
                              onChange={(e) => setEditingPhone(e.target.value)}
                              placeholder="+919876543210"
                              className="bg-slate-800 text-xs font-mono text-white px-2 py-1 rounded border border-sky-500 focus:outline-none w-36"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSavePhone(r._id)}
                              className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded"
                              title="Save"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                          {phoneError && <p className="text-[10px] text-rose-400">{phoneError}</p>}
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          {hasPhone ? (
                            <span className="font-mono font-semibold text-emerald-400 flex items-center space-x-1">
                              <Phone className="w-3 h-3" />
                              <span>{r.whatsAppNumber}</span>
                            </span>
                          ) : (
                            <span className="text-amber-400 flex items-center space-x-1 font-semibold">
                              <AlertTriangle className="w-3 h-3" />
                              <span>No WhatsApp Mapped</span>
                            </span>
                          )}
                          <button
                            onClick={() => handleStartEdit(r)}
                            className="p-1 text-slate-500 hover:text-slate-300"
                            title="Edit Phone Number"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {r.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleStartEdit(r)}
                        className="text-xs text-sky-400 hover:text-sky-300 font-medium"
                      >
                        Update Phone
                      </button>
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

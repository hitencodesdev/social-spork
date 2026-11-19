import React, { useState } from 'react';
import { X, Building, Phone, Plus } from 'lucide-react';
import api from '../services/api';

export default function AddRestaurantModal({ onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [sRid, setSRid] = useState('');
  const [zRid, setZRid] = useState('');
  const [city, setCity] = useState('');
  const [subzone, setSubzone] = useState('');
  const [whatsAppNumber, setWhatsAppNumber] = useState('');
  const [whatsAppContactName, setWhatsAppContactName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Restaurant name is required');
      return;
    }
    if (!sRid.trim() && !zRid.trim()) {
      setError('Please provide at least one Platform ID (S-RID or Z-RID)');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await api.createRestaurant({
        name: name.trim(),
        sRid: sRid.trim() || null,
        zRid: zRid.trim() || null,
        city: city.trim(),
        subzone: subzone.trim(),
        whatsAppNumber: whatsAppNumber.trim(),
        whatsAppContactName: whatsAppContactName.trim()
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create restaurant');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white">Add New Restaurant Outlet</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Restaurant Name *</label>
            <input
              type="text"
              placeholder="e.g. Sidewok Asian Diner"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-slate-800 text-xs text-white px-3 py-2 rounded-lg border border-slate-700 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Swiggy ID (S-RID)</label>
              <input
                type="text"
                placeholder="e.g. 12345"
                value={sRid}
                onChange={(e) => setSRid(e.target.value)}
                className="w-full bg-slate-800 text-xs text-white px-3 py-2 rounded-lg border border-slate-700 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Zomato ID (Z-RID)</label>
              <input
                type="text"
                placeholder="e.g. 18492011"
                value={zRid}
                onChange={(e) => setZRid(e.target.value)}
                className="w-full bg-slate-800 text-xs text-white px-3 py-2 rounded-lg border border-slate-700 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">City</label>
              <input
                type="text"
                placeholder="e.g. Bengaluru"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-slate-800 text-xs text-white px-3 py-2 rounded-lg border border-slate-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Subzone / Area</label>
              <input
                type="text"
                placeholder="e.g. Indiranagar"
                value={subzone}
                onChange={(e) => setSubzone(e.target.value)}
                className="w-full bg-slate-800 text-xs text-white px-3 py-2 rounded-lg border border-slate-700 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Registered WhatsApp Number (10 digits or +91...)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="+919876543210"
                value={whatsAppNumber}
                onChange={(e) => setWhatsAppNumber(e.target.value)}
                className="w-full bg-slate-800 text-xs text-white pl-9 pr-3 py-2 rounded-lg border border-slate-700 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Manager / Contact Name</label>
            <input
              type="text"
              placeholder="e.g. Rajesh Kumar"
              value={whatsAppContactName}
              onChange={(e) => setWhatsAppContactName(e.target.value)}
              className="w-full bg-slate-800 text-xs text-white px-3 py-2 rounded-lg border border-slate-700 focus:outline-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow transition"
          >
            {isSubmitting ? 'Creating...' : 'Create Restaurant'}
          </button>
        </form>
      </div>
    </div>
  );
}

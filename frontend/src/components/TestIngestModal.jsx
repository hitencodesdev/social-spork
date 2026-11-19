import React, { useState } from 'react';
import { X, Send, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function TestIngestModal({ restaurants = [], onClose, onIngestSuccess }) {
  const [platform, setPlatform] = useState('SWIGGY');
  const [selectedRid, setSelectedRid] = useState(restaurants[0]?.sRid || '12345');
  const [orderId, setOrderId] = useState(`ORD-${Math.floor(100000 + Math.random() * 900000)}`);
  const [complaintEventId, setComplaintEventId] = useState(`EVT-${Date.now()}`);
  const [category, setCategory] = useState('Bad Quality Food');
  const [issue, setIssue] = useState('Contaminated / Expired Food');
  const [productName, setProductName] = useState('Regular Mix Sweets (1kg)');
  const [customerDescription, setCustomerDescription] = useState('Customer reported expired sweets with mold.');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handlePlatformChange = (p) => {
    setPlatform(p);
    // Auto select first restaurant's corresponding ID
    if (restaurants.length > 0) {
      setSelectedRid(p === 'SWIGGY' ? (restaurants[0].sRid || '12345') : (restaurants[0].zRid || '18492011'));
    }
  };

  const handleSimulate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setResult(null);

    const payload = {
      platform,
      restaurantId: selectedRid,
      orderId,
      complaintEventId,
      category,
      issue,
      productName,
      customerDescription,
      imageUrls: imageUrl ? [imageUrl] : []
    };

    try {
      const res = await api.ingestComplaint(payload);
      setResult(res);
      if (onIngestSuccess) onIngestSuccess();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Ingestion failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-orange-400" />
            <h3 className="text-base font-bold text-white">Simulate Complaint Ingestion</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSimulate} className="p-6 space-y-4">
          {/* Platform toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Delivery Platform</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handlePlatformChange('SWIGGY')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                  platform === 'SWIGGY'
                    ? 'bg-orange-500/20 text-orange-400 border-orange-500'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                Swiggy (S-RID Matching)
              </button>
              <button
                type="button"
                onClick={() => handlePlatformChange('ZOMATO')}
                className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                  platform === 'ZOMATO'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                Zomato (Z-RID Matching)
              </button>
            </div>
          </div>

          {/* Restaurant picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              Target Restaurant ({platform === 'SWIGGY' ? 'S-RID' : 'Z-RID'})
            </label>
            <select
              value={selectedRid}
              onChange={(e) => setSelectedRid(e.target.value)}
              className="w-full bg-slate-800 text-xs text-white px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-orange-500"
            >
              {restaurants.map((r) => {
                const rid = platform === 'SWIGGY' ? r.sRid : r.zRid;
                return (
                  <option key={r._id} value={rid || ''}>
                    {r.name} — ({platform === 'SWIGGY' ? 'S-RID' : 'Z-RID'}: {rid || 'N/A'}) [
                    {r.whatsAppNumber || 'No WhatsApp'}]
                  </option>
                );
              })}
              <option value="999999">Unknown / Unmapped Restaurant (ID: 999999)</option>
            </select>
          </div>

          {/* Order ID & Event ID */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Order ID</label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                required
                className="w-full bg-slate-800 text-xs text-white px-3 py-2 rounded-lg border border-slate-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Complaint Event ID</label>
              <input
                type="text"
                value={complaintEventId}
                onChange={(e) => setComplaintEventId(e.target.value)}
                className="w-full bg-slate-800 text-xs text-white px-3 py-2 rounded-lg border border-slate-700 focus:outline-none"
              />
            </div>
          </div>

          {/* Issue & Product */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Issue Specifics</label>
              <input
                type="text"
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                required
                className="w-full bg-slate-800 text-xs text-white px-3 py-2 rounded-lg border border-slate-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Product Name</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
                className="w-full bg-slate-800 text-xs text-white px-3 py-2 rounded-lg border border-slate-700 focus:outline-none"
              />
            </div>
          </div>

          {/* Customer Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Customer Description</label>
            <textarea
              value={customerDescription}
              onChange={(e) => setCustomerDescription(e.target.value)}
              rows={2}
              className="w-full bg-slate-800 text-xs text-white px-3 py-2 rounded-lg border border-slate-700 focus:outline-none"
            />
          </div>

          {/* Photo URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Customer Photo URL</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full bg-slate-800 text-xs text-white px-3 py-2 rounded-lg border border-slate-700 focus:outline-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400">
              {error}
            </div>
          )}

          {result && (
            <div
              className={`p-3.5 rounded-xl border text-xs ${
                result.duplicate
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              }`}
            >
              <div className="flex items-center space-x-2 font-bold">
                {result.duplicate ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                <span>{result.duplicate ? 'Deduplication Triggered!' : 'Ingested & Dispatched!'}</span>
              </div>
              <p className="mt-1">{result.message}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20 transition flex items-center justify-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Ingesting...' : 'Ingest & Dispatch to WhatsApp'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

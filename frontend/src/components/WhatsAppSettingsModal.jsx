import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Shield, Check, AlertCircle, Send, Key, Phone, HelpCircle } from 'lucide-react';
import api from '../services/api';

export default function WhatsAppSettingsModal({ onClose, onSettingsUpdated }) {
  const [settings, setSettings] = useState({
    mode: 'mock',
    phoneNumberId: '',
    wabaId: '',
    templateName: 'restaurant_complaint_alert_v1',
    maskedToken: '',
    senderDisplayNumber: ''
  });
  const [accessToken, setAccessToken] = useState('');
  const [displayNumber, setDisplayNumber] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.getWhatsAppSettings();
      if (data.settings) {
        setSettings(data.settings);
        setDisplayNumber(data.settings.senderDisplayNumber || '');
      }
    } catch (err) {
      console.error('Failed to load WhatsApp settings:', err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSaveMessage('');

    try {
      const payload = {
        mode: settings.mode,
        phoneNumberId: settings.phoneNumberId,
        wabaId: settings.wabaId,
        templateName: settings.templateName,
        displayNumber: displayNumber
      };
      if (accessToken.trim()) {
        payload.accessToken = accessToken.trim();
      }

      const res = await api.updateWhatsAppSettings(payload);
      setSaveMessage('WhatsApp Sender settings successfully saved!');
      setAccessToken('');
      loadSettings();
      if (onSettingsUpdated) onSettingsUpdated();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSend = async () => {
    if (!testPhone.trim()) {
      setError('Please enter a test phone number to receive the test message.');
      return;
    }

    setTestLoading(true);
    setTestResult(null);
    setError('');

    try {
      const res = await api.testSendWhatsApp(testPhone.trim());
      setTestResult(res);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Test send failed');
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Social Spork Sender WhatsApp Settings</span>
              </h3>
              <p className="text-xs text-slate-400">
                Configure the registered business account from which complaints are sent.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Active Mode Banner */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Current Sender Status
              </span>
              <div className="text-sm font-bold text-white flex items-center space-x-2 mt-0.5">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    settings.mode === 'live' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                ></span>
                <span>
                  {settings.mode === 'live'
                    ? 'Meta Production Cloud API (LIVE)'
                    : 'Simulator Mode (MOCK TESTING)'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Sender Number:{' '}
                <strong className="text-emerald-400 font-mono">
                  {displayNumber || (settings.mode === 'mock' ? '+91 99999 00000 (Simulated)' : 'Meta Verified Number')}
                </strong>
              </p>
            </div>

            <div className="text-right">
              <span
                className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                  settings.mode === 'live'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {settings.mode}
              </span>
            </div>
          </div>

          {/* Mode Switch Radio */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Select Operating Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSettings({ ...settings, mode: 'mock' })}
                className={`p-3 rounded-xl border text-left transition ${
                  settings.mode === 'mock'
                    ? 'bg-amber-500/10 border-amber-500/50 text-white'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>1. Simulator Mode</span>
                  {settings.mode === 'mock' && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Tests the entire flow with zero Meta charges or setup.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSettings({ ...settings, mode: 'live' })}
                className={`p-3 rounded-xl border text-left transition ${
                  settings.mode === 'live'
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>2. Live Meta Cloud API</span>
                  {settings.mode === 'live' && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Sends real WhatsApp messages to real phones via Meta.
                </p>
              </button>
            </div>
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleSave} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Sender Display Number (Optional label)
              </label>
              <input
                type="text"
                value={displayNumber}
                onChange={(e) => setDisplayNumber(e.target.value)}
                placeholder="e.g. +91 98765 43210 (Social Spork Support)"
                className="w-full bg-slate-800 text-xs text-white px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Meta Phone Number ID
                </label>
                <input
                  type="text"
                  value={settings.phoneNumberId}
                  onChange={(e) => setSettings({ ...settings, phoneNumberId: e.target.value })}
                  placeholder="e.g. 104829482948201"
                  className="w-full bg-slate-800 text-xs text-white px-3 py-2 rounded-lg border border-slate-700 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  WABA Account ID
                </label>
                <input
                  type="text"
                  value={settings.wabaId}
                  onChange={(e) => setSettings({ ...settings, wabaId: e.target.value })}
                  placeholder="e.g. 192837465019283"
                  className="w-full bg-slate-800 text-xs text-white px-3 py-2 rounded-lg border border-slate-700 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1 flex items-center justify-between">
                <span>Meta Permanent System User Access Token</span>
                {settings.maskedToken && (
                  <span className="text-[10px] text-slate-500">Current: {settings.maskedToken}</span>
                )}
              </label>
              <input
                type="password"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder={settings.maskedToken ? 'Leave blank to keep current token' : 'Paste Meta System User Token (EAAG...)'}
                className="w-full bg-slate-800 text-xs text-white px-3 py-2 rounded-lg border border-slate-700 focus:outline-none font-mono"
              />
            </div>

            {saveMessage && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 flex items-center space-x-2">
                <Check className="w-4 h-4" />
                <span>{saveMessage}</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg transition"
            >
              {isSaving ? 'Saving Configuration...' : 'Save Sender Configuration'}
            </button>
          </form>

          {/* Test Sender Ping Section */}
          <div className="pt-4 border-t border-slate-800 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <Phone className="w-3.5 h-3.5 text-sky-400" />
              <span>Test Sender Connection (Send a Ping)</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Enter your own mobile number to send a test alert from this sender configuration:
            </p>

            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="+919876543210"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="flex-1 bg-slate-800 text-xs text-white px-3 py-2 rounded-lg border border-slate-700 focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={handleTestSend}
                disabled={testLoading}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition flex items-center space-x-1"
              >
                <Send className="w-3 h-3" />
                <span>{testLoading ? 'Sending...' : 'Send Test Ping'}</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs border ${
                  testResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}
              >
                {testResult.message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

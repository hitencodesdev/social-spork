import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  FileSpreadsheet,
  Send,
  Users,
  LogOut,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  onOpenIngestModal,
  onOpenUploadModal,
  onOpenSettingsModal,
  onOpenTeamModal,
  currentUser,
  onLogout,
  health
}) {
  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 backdrop-blur bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & Brand */}
          <div
            className="flex items-center space-x-3 cursor-pointer flex-shrink-0"
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="h-10 px-2.5 py-1 bg-white rounded-xl shadow-md shadow-orange-500/10 flex items-center justify-center border border-slate-700">
              <img
                src="/logo.png"
                alt="Social Spork Logo"
                className="h-7 w-auto object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base sm:text-lg font-bold text-white tracking-tight">Social Spork</span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Automation Hub
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-slate-400">Swiggy & Zomato WhatsApp Dispatcher</p>
            </div>
          </div>

          {/* Quick Actions & Status */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            {/* Sender WhatsApp Settings Button (Admin Only) */}
            {isAdmin && (
              <button
                onClick={onOpenSettingsModal}
                className="flex items-center space-x-1.5 sm:space-x-2 bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-700/80 text-xs transition cursor-pointer"
                title="Configure WhatsApp Sender Number & Meta API credentials"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-slate-300 hidden sm:inline">Sender:</span>
                <span className="font-bold text-emerald-400 uppercase">
                  {health?.whatsappMode || 'MOCK'} ⚙️
                </span>
              </button>
            )}

            {/* Team Management (Admin Only) */}
            {isAdmin && (
              <button
                onClick={onOpenTeamModal}
                className="inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition cursor-pointer"
                title="Manage employees and allot restaurants"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Team & Allotment</span>
              </button>
            )}

            {/* Sync Excel (Admin or Employee) */}
            <button
              onClick={onOpenUploadModal}
              className="inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Sync Excel</span>
            </button>

            {/* Test Ingest */}
            <button
              onClick={onOpenIngestModal}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white shadow-md shadow-orange-500/20 transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>+ Ingest Test</span>
            </button>

            {/* User Profile Pill & Logout */}
            <div className="flex items-center pl-1 sm:pl-2 border-l border-slate-800 space-x-2">
              <div
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs border ${
                  isAdmin
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                }`}
                title={`Logged in as ${currentUser?.name} (${currentUser?.role})`}
              >
                <span>{isAdmin ? '👑' : '👤'}</span>
                <span className="font-semibold hidden md:inline truncate max-w-[120px]">
                  {currentUser?.name || 'User'}
                </span>
              </div>

              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                title="Sign out of Social Spork"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ALWAYS-VISIBLE NAVIGATION BAR (For All Screen Sizes) */}
        <div className="py-2.5 border-t border-slate-800/80 flex items-center space-x-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'dashboard'
                ? 'bg-slate-800 text-white shadow border border-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-orange-400" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('complaints')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'complaints'
                ? 'bg-slate-800 text-white shadow border border-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <ClipboardList className="w-4 h-4 text-rose-400" />
            <span>Complaints Log</span>
          </button>

          <button
            onClick={() => setActiveTab('restaurants')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === 'restaurants'
                ? 'bg-sky-600/20 text-sky-300 shadow border border-sky-500/50'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70 border border-slate-700/50 bg-slate-800/40'
            }`}
          >
            <Building2 className="w-4 h-4 text-sky-400" />
            <span>{isAdmin ? 'All Restaurants & Contacts' : 'My Assigned Restaurants'}</span>
            <span className="ml-1 px-1.5 py-0.2 bg-sky-500/20 text-sky-300 text-[10px] rounded-full">
              WhatsApp #
            </span>
          </button>

          <button
            onClick={() => setActiveTab('sync')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === 'sync'
                ? 'bg-slate-800 text-white shadow border border-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Weekly Sync & Audit</span>
          </button>
        </div>
      </div>
    </header>
  );
}

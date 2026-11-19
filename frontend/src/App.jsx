import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import StatCards from './components/StatCards';
import ComplaintTable from './components/ComplaintTable';
import ComplaintDetailModal from './components/ComplaintDetailModal';
import RestaurantTable from './components/RestaurantTable';
import ExcelUploadModal from './components/ExcelUploadModal';
import TestIngestModal from './components/TestIngestModal';
import AddRestaurantModal from './components/AddRestaurantModal';
import WhatsAppSettingsModal from './components/WhatsAppSettingsModal';
import TeamManagementModal from './components/TeamManagementModal';
import SyncHistoryTable from './components/SyncHistoryTable';
import LoginScreen from './components/LoginScreen';
import api from './services/api';
import { Sparkles, Download, FileSpreadsheet, Chrome, ShieldAlert, Users, Store } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('spork_user');
      const token = localStorage.getItem('spork_auth_token');
      return saved && token ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [metrics, setMetrics] = useState({});
  const [complaints, setComplaints] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [syncHistory, setSyncHistory] = useState([]);
  const [health, setHealth] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [showAddRestaurantModal, setShowAddRestaurantModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);

  // Fetch all initial data
  const loadData = async () => {
    if (!localStorage.getItem('spork_auth_token')) return;

    setIsLoading(true);
    try {
      const [healthData, overviewData, complaintsData, restaurantsData, historyData] = await Promise.all([
        api.getHealth().catch(() => ({ status: 'offline' })),
        api.getAnalyticsOverview().catch(() => ({ metrics: {} })),
        api.getComplaints().catch(() => ({ complaints: [] })),
        api.getRestaurants().catch(() => ({ restaurants: [] })),
        api.getSyncHistory().catch(() => ({ history: [] }))
      ]);

      setHealth(healthData);
      setMetrics(overviewData.metrics || {});
      setComplaints(complaintsData.complaints || []);
      setRestaurants(restaurantsData.restaurants || []);
      setSyncHistory(historyData.history || []);
    } catch (err) {
      console.error('Error loading data:', err);
      if (err.response?.status === 401) {
        handleLogout(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
      const interval = setInterval(loadData, 6000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = (promptUser = true) => {
    if (!promptUser || window.confirm('Are you sure you want to sign out?')) {
      localStorage.removeItem('spork_auth_token');
      localStorage.removeItem('spork_user');
      setCurrentUser(null);
    }
  };

  const handleRetryComplaint = async (id) => {
    try {
      await api.retryComplaint(id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to retry complaint');
    }
  };

  const handleUpdateRestaurant = async (id, data) => {
    await api.updateRestaurant(id, data);
    loadData();
  };

  const handleDownloadTemplate = () => {
    window.open(api.getSampleTemplateUrl(), '_blank');
  };

  // If user is not logged in, render the login screen
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenIngestModal={() => setShowIngestModal(true)}
        onOpenUploadModal={() => setShowUploadModal(true)}
        onOpenSettingsModal={() => setShowSettingsModal(true)}
        onOpenTeamModal={() => setShowTeamModal(true)}
        currentUser={currentUser}
        onLogout={() => handleLogout(true)}
        health={health}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Banner: User Role & Allocation Info */}
        <div className="mb-6 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2.5 rounded-xl border ${
                isAdmin
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}
            >
              {isAdmin ? <Users className="w-5 h-5" /> : <Store className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>
                  {isAdmin
                    ? '👑 Master Admin Mode — Full Organization Overview'
                    : `👤 ${currentUser.name}'s Operations Workspace`}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                    isAdmin
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}
                >
                  {isAdmin ? 'Master Access' : `Allotted: ${restaurants.length} Outlet(s)`}
                </span>
              </h4>
              <p className="text-xs text-slate-400">
                {isAdmin
                  ? 'You have complete visibility over all partner restaurants, employee allocations, and WhatsApp dispatch logs.'
                  : `You are restricted to your assigned restaurant outlets. Only your outlets' complaints will appear on this screen.`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isAdmin && (
              <button
                onClick={() => setShowTeamModal(true)}
                className="px-3 py-1.5 bg-indigo-600/90 hover:bg-indigo-600 text-xs font-semibold text-white rounded-lg transition flex items-center space-x-1.5 cursor-pointer shadow"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Allot Outlets</span>
              </button>
            )}
            <button
              onClick={() => setShowIngestModal(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg border border-slate-700 flex items-center space-x-1.5 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate Ingest</span>
            </button>
          </div>
        </div>

        {/* Tab: Dashboard Overview */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <StatCards metrics={metrics} />
            <ComplaintTable
              complaints={complaints}
              onSelectComplaint={setSelectedComplaint}
              onRetry={handleRetryComplaint}
              isLoading={isLoading}
              onRefresh={loadData}
            />
          </div>
        )}

        {/* Tab: Complaints Log */}
        {activeTab === 'complaints' && (
          <div className="space-y-6">
            <ComplaintTable
              complaints={complaints}
              onSelectComplaint={setSelectedComplaint}
              onRetry={handleRetryComplaint}
              isLoading={isLoading}
              onRefresh={loadData}
            />
          </div>
        )}

        {/* Tab: Restaurants Directory */}
        {activeTab === 'restaurants' && (
          <div className="space-y-6">
            <RestaurantTable
              restaurants={restaurants}
              onUpdateRestaurant={handleUpdateRestaurant}
              onOpenAddModal={() => setShowAddRestaurantModal(true)}
              onDownloadTemplate={handleDownloadTemplate}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Tab: Weekly Sync & Audit */}
        {activeTab === 'sync' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Weekly Master Sheet Synchronization Architecture</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-3xl">
                Social Spork updates restaurant master data weekly. When synchronizing from your master Excel or Google Sheet,
                the engine validates missing IDs, matches existing records via Z-RID & S-RID, and <strong className="text-emerald-400 font-semibold">strictly preserves existing WhatsApp numbers</strong> even if the master sheet row does not contain one.
              </p>
              <div className="mt-4 flex items-center space-x-3">
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white rounded-lg shadow transition"
                >
                  Upload Updated Master (.xlsx / .csv)
                </button>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded-lg border border-slate-700 flex items-center space-x-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Master Excel Format</span>
                </button>
              </div>
            </div>

            <SyncHistoryTable history={syncHistory} onRefresh={loadData} isLoading={isLoading} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900/50 border-t border-slate-900 py-4 text-center text-xs text-slate-500">
        Social Spork Automated Restaurant Complaint Management & WhatsApp Notification System © 2026. Official Meta Cloud API Integration.
      </footer>

      {/* Modals */}
      {selectedComplaint && (
        <ComplaintDetailModal
          complaint={selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          onRetry={handleRetryComplaint}
        />
      )}

      {showUploadModal && (
        <ExcelUploadModal
          onClose={() => setShowUploadModal(false)}
          onSyncComplete={loadData}
        />
      )}

      {showIngestModal && (
        <TestIngestModal
          restaurants={restaurants}
          onClose={() => setShowIngestModal(false)}
          onIngestSuccess={loadData}
        />
      )}

      {showAddRestaurantModal && (
        <AddRestaurantModal
          onClose={() => setShowAddRestaurantModal(false)}
          onSuccess={loadData}
        />
      )}

      {showSettingsModal && (
        <WhatsAppSettingsModal
          onClose={() => setShowSettingsModal(false)}
          onSettingsUpdated={loadData}
        />
      )}

      {showTeamModal && (
        <TeamManagementModal
          restaurants={restaurants}
          onClose={() => setShowTeamModal(false)}
          onTeamUpdated={loadData}
        />
      )}
    </div>
  );
}

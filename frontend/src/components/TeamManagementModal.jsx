import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Shield, User, Check, Trash2, Edit3, Store, AlertCircle, Key } from 'lucide-react';
import api from '../services/api';

export default function TeamManagementModal({ onClose, restaurants = [], onTeamUpdated }) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState([]);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.getUsers();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('EMPLOYEE');
    setSelectedRestaurantIds([]);
    setFormError('');
    setShowAddForm(false);
    setEditingUserId(null);
  };

  const startEdit = (user) => {
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    setRole(user.role);
    setSelectedRestaurantIds(user.assignedRestaurantIds || []);
    setEditingUserId(user._id || user.id);
    setShowAddForm(true);
    setFormError('');
  };

  const toggleRestaurantSelection = (id) => {
    setSelectedRestaurantIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllRestaurants = () => {
    if (selectedRestaurantIds.length === restaurants.length) {
      setSelectedRestaurantIds([]);
    } else {
      setSelectedRestaurantIds(restaurants.map((r) => r._id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      if (editingUserId) {
        // Update user
        const payload = {
          name,
          role,
          assignedRestaurantIds: selectedRestaurantIds
        };
        if (password.trim()) {
          payload.password = password.trim();
        }
        await api.updateUser(editingUserId, payload);
      } else {
        // Create user
        if (!password || password.length < 6) {
          setFormError('Password must be at least 6 characters.');
          setIsSubmitting(false);
          return;
        }
        await api.createUser({
          name,
          email,
          password,
          role,
          assignedRestaurantIds: selectedRestaurantIds
        });
      }

      resetForm();
      await loadUsers();
      if (onTeamUpdated) onTeamUpdated();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to save user. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.email === 'admin@socialspork.com') {
      alert('Cannot delete the primary Master Admin account.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete employee "${user.name}"?`)) {
      try {
        await api.deleteUser(user._id || user.id);
        await loadUsers();
        if (onTeamUpdated) onTeamUpdated();
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to delete user');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Team & Outlet Allocation</h3>
              <p className="text-xs text-slate-400">
                Manage employee accounts and allot specific restaurants to each person
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="py-3 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-slate-400 font-medium">
            Total Team Members: <span className="text-white font-bold">{users.length}</span>
          </div>
          {!showAddForm && (
            <button
              onClick={() => {
                resetForm();
                setShowAddForm(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-600 hover:to-rose-700 text-white shadow-md shadow-orange-500/20 transition cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add New Employee</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Add / Edit Form */}
          {showAddForm && (
            <div className="bg-slate-950 border border-indigo-500/30 rounded-xl p-5 mb-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>{editingUserId ? 'Edit Employee / Allotments' : 'Create New Employee Account'}</span>
                </h4>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center space-x-2 text-rose-400 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      disabled={!!editingUserId}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="priya@socialspork.com"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      {editingUserId ? 'New Password (leave blank to keep current)' : 'Password *'}
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={editingUserId ? '••••••••' : 'Min 6 characters'}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Access Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="EMPLOYEE">👤 Employee (Only sees assigned outlets)</option>
                      <option value="ADMIN">👑 Master Admin (Full access to all outlets)</option>
                    </select>
                  </div>
                </div>

                {/* Restaurant Assignment Selection */}
                {role === 'EMPLOYEE' && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                        <Store className="w-3.5 h-3.5 text-orange-400" />
                        <span>Allot Restaurants ({selectedRestaurantIds.length} Selected)</span>
                      </label>
                      <button
                        type="button"
                        onClick={selectAllRestaurants}
                        className="text-[11px] text-orange-400 hover:text-orange-300 transition"
                      >
                        {selectedRestaurantIds.length === restaurants.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-900/60 rounded-xl border border-slate-800">
                      {restaurants.map((rest) => {
                        const isSelected = selectedRestaurantIds.includes(rest._id);
                        return (
                          <div
                            key={rest._id}
                            onClick={() => toggleRestaurantSelection(rest._id)}
                            className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition ${
                              isSelected
                                ? 'bg-orange-500/10 border-orange-500/40 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <div className="truncate mr-2">
                              <div className="font-semibold text-white truncate">{rest.name}</div>
                              <div className="text-[10px] text-slate-400">
                                S-RID: {rest.sRid || 'N/A'} | Z-RID: {rest.zRid || 'N/A'}
                              </div>
                            </div>
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                isSelected
                                  ? 'bg-orange-500 border-orange-500 text-white'
                                  : 'border-slate-600'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 bg-gradient-to-r from-orange-500 to-rose-600 text-white font-semibold text-xs rounded-lg shadow-md transition disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : editingUserId ? 'Save Changes' : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Users List */}
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 text-xs">Loading team members...</div>
          ) : (
            <div className="space-y-2">
              {users.map((u) => {
                const isMasterAdmin = u.email === 'admin@socialspork.com';
                const assignedCount = u.assignedRestaurantIds ? u.assignedRestaurantIds.length : 0;

                return (
                  <div
                    key={u._id || u.id}
                    className="bg-slate-950 border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl flex items-center justify-between transition"
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                          u.role === 'ADMIN'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {u.role === 'ADMIN' ? '👑' : '👤'}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-white text-xs">{u.name}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              u.role === 'ADMIN'
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {u.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate flex items-center space-x-2 mt-0.5">
                          <span>{u.email}</span>
                          <span>&bull;</span>
                          <span className="text-orange-400">
                            {u.role === 'ADMIN'
                              ? 'All Outlets (Full Access)'
                              : `${assignedCount} Assigned Outlet${assignedCount === 1 ? '' : 's'}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                      <button
                        onClick={() => startEdit(u)}
                        className="p-1.5 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition cursor-pointer"
                        title="Edit employee / allot restaurants"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {!isMasterAdmin && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg border border-rose-500/20 transition cursor-pointer"
                          title="Delete employee"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useAuth } from "../context";
import { UserProfile, UserRole } from "@shared/types/index";
import { 
  Shield, 
  Users, 
  ShieldAlert, 
  Crown, 
  UserCheck, 
  Ban, 
  Search, 
  Filter, 
  RefreshCw, 
  AlertTriangle, 
  Check, 
  X,
  Mail,
  Calendar,
  Clock
} from "lucide-react";

export default function AdminUsersView() {
  const { userProfile, isOwner, refreshUserProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Action states
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  
  // Ban Modal state
  const [selectedUserForBan, setSelectedUserForBan] = useState<UserProfile | null>(null);
  const [banReasonInput, setBanReasonInput] = useState<string>("");

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) {
        throw new Error("Failed to load registered users list.");
      }
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError(err.message || "Failed to load users list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (targetUser: UserProfile, newRole: UserRole) => {
    if (targetUser.role === newRole) return;
    
    // Prevent owner from accidentally demoting themselves if they are the logged in owner
    if (targetUser.uid === userProfile?.uid && newRole !== "owner") {
      const confirmDemote = window.confirm(
        "Warning: You are about to change your own role from Owner! Doing so will revoke your access to this Admin area. Are you sure?"
      );
      if (!confirmDemote) return;
    }

    setUpdatingUid(targetUser.uid);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/users/${targetUser.uid}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update user role.");
      }

      setUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, role: newRole } : u));
      setActionSuccess(`Successfully updated ${targetUser.displayName || targetUser.email}'s role to ${newRole.toUpperCase()}.`);
      
      // If updating self, refresh current user profile
      if (targetUser.uid === userProfile?.uid) {
        await refreshUserProfile();
      }
    } catch (err: any) {
      alert(err.message || "Failed to update user role.");
    } finally {
      setUpdatingUid(null);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const handleToggleBanStatus = async (targetUser: UserProfile) => {
    if (targetUser.isBanned) {
      // Unban
      setUpdatingUid(targetUser.uid);
      try {
        const res = await fetch(`/api/users/${targetUser.uid}/ban`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isBanned: false, banReason: "" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to unban user.");

        setUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, isBanned: false, banReason: "" } : u));
        setActionSuccess(`Unbanned ${targetUser.displayName || targetUser.email}. Access restored.`);
      } catch (err: any) {
        alert(err.message || "Failed to unban user.");
      } finally {
        setUpdatingUid(null);
        setTimeout(() => setActionSuccess(null), 4000);
      }
    } else {
      // Open ban modal
      if (targetUser.uid === userProfile?.uid) {
        alert("You cannot ban your own account!");
        return;
      }
      setSelectedUserForBan(targetUser);
      setBanReasonInput("");
    }
  };

  const confirmBanUser = async () => {
    if (!selectedUserForBan) return;
    setUpdatingUid(selectedUserForBan.uid);
    try {
      const res = await fetch(`/api/users/${selectedUserForBan.uid}/ban`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBanned: true, banReason: banReasonInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to ban user.");

      setUsers(prev => prev.map(u => u.uid === selectedUserForBan.uid ? { ...u, isBanned: true, banReason: banReasonInput } : u));
      setActionSuccess(`Banned ${selectedUserForBan.displayName || selectedUserForBan.email}. Account access suspended.`);
      setSelectedUserForBan(null);
    } catch (err: any) {
      alert(err.message || "Failed to ban user.");
    } finally {
      setUpdatingUid(null);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  // Filtered users
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      (u.displayName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.uid || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "banned" && u.isBanned) ||
      (statusFilter === "active" && !u.isBanned);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Metrics
  const totalCount = users.length;
  const ownersCount = users.filter(u => u.role === "owner").length;
  const adminsCount = users.filter(u => u.role === "admin").length;
  const standardCount = users.filter(u => u.role === "user").length;
  const bannedCount = users.filter(u => u.isBanned).length;

  if (!isOwner) {
    return (
      <div className="max-w-4xl mx-auto my-12 p-8 bg-slate-800/90 border border-slate-700/80 rounded-2xl text-center shadow-xl">
        <ShieldAlert className="w-16 h-16 text-rose-400 mx-auto mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Access Denied</h2>
        <p className="text-slate-400 max-w-md mx-auto">
          The Admin User Management area is strictly reserved for accounts with the <strong>Owner</strong> role.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/80 p-6 rounded-2xl border border-slate-700/80 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
                User Management & Access Control
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                  Owner Area
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Manage system roles, assign permissions, and restrict account access.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700/80 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl border border-slate-600/80 transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Users
        </button>
      </div>

      {/* Success Banner */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm flex items-center gap-3 animate-fade-in shadow-lg">
          <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Total Users</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{totalCount}</div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Owners</span>
            <Crown className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{ownersCount}</div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Admins</span>
            <Shield className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400">{adminsCount}</div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Standard Users</span>
            <UserCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400">{standardCount}</div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-md col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Banned Accounts</span>
            <Ban className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">{bannedCount}</div>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email or UID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/80 text-slate-100 pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-700/80 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/50 transition-all placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <Filter className="w-4 h-4 text-slate-400" />
            <span>Filters:</span>
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-900/80 text-slate-200 text-sm px-3 py-2 rounded-xl border border-slate-700/80 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Roles</option>
            <option value="owner">Owners Only</option>
            <option value="admin">Admins Only</option>
            <option value="user">Standard Users Only</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900/80 text-slate-200 text-sm px-3 py-2 rounded-xl border border-slate-700/80 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Accounts</option>
            <option value="banned">Banned Accounts</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
            <p className="text-sm">Loading registered user accounts...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-400 space-y-3">
            <AlertTriangle className="w-8 h-8 mx-auto" />
            <p>{error}</p>
            <button
              onClick={fetchUsers}
              className="px-4 py-2 bg-slate-700 text-slate-200 rounded-xl text-xs hover:bg-slate-600 transition-all"
            >
              Try Again
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-300">No users match your filters.</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting search query or filter options.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-700/80">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Current Role</th>
                  <th className="px-6 py-4">Account Status</th>
                  <th className="px-6 py-4">Registered & Active</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {filteredUsers.map((u) => {
                  const isSelf = u.uid === userProfile?.uid;
                  const isUpdating = updatingUid === u.uid;

                  return (
                    <tr 
                      key={u.uid} 
                      className={`hover:bg-slate-700/30 transition-colors ${u.isBanned ? "bg-rose-950/10" : ""}`}
                    >
                      {/* User Identity */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {u.photoURL ? (
                            <img
                              src={u.photoURL}
                              alt={u.displayName}
                              className="w-10 h-10 rounded-full border border-slate-600 object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-amber-400 font-bold text-base">
                              {(u.displayName || u.email || "U").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-100 flex items-center gap-2">
                              {u.displayName || "Anonymous User"}
                              {isSelf && (
                                <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-500" />
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Selector */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={u.role}
                            disabled={isUpdating}
                            onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all cursor-pointer focus:outline-none ${
                              u.role === "owner"
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                : u.role === "admin"
                                ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                                : "bg-blue-500/20 text-blue-300 border-blue-500/40"
                            }`}
                          >
                            <option value="user" className="bg-slate-900 text-slate-200">User (Standard)</option>
                            <option value="admin" className="bg-slate-900 text-slate-200">Admin (Database Manager)</option>
                            <option value="owner" className="bg-slate-900 text-slate-200">Owner (Full Admin & Roles)</option>
                          </select>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {u.isBanned ? (
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-rose-500/20 text-rose-300 rounded-full border border-rose-500/30">
                              <Ban className="w-3 h-3" />
                              Banned
                            </span>
                            {u.banReason && (
                              <p className="text-[11px] text-rose-400/80 mt-1 italic max-w-xs truncate" title={u.banReason}>
                                Reason: "{u.banReason}"
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            Active
                          </span>
                        )}
                      </td>

                      {/* Dates */}
                      <td className="px-6 py-4 text-xs text-slate-400 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          Joined: {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "N/A"}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          Active: {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleToggleBanStatus(u)}
                          disabled={isUpdating || isSelf}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                            u.isBanned
                              ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30"
                              : "bg-rose-600/20 text-rose-300 border-rose-500/40 hover:bg-rose-600/30"
                          }`}
                        >
                          {u.isBanned ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              Unban Account
                            </>
                          ) : (
                            <>
                              <Ban className="w-3.5 h-3.5" />
                              Ban User
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ban User Confirmation Modal */}
      {selectedUserForBan && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-rose-500/40 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-fade-in">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-3 bg-rose-500/20 rounded-xl border border-rose-500/30">
                  <Ban className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">Ban User Account</h3>
                  <p className="text-xs text-slate-400">Suspend access for {selectedUserForBan.displayName || selectedUserForBan.email}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUserForBan(null)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-rose-950/30 border border-rose-900/50 p-3.5 rounded-xl text-xs text-rose-300 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Banning Effect:
              </p>
              <p className="text-slate-300">
                This user will immediately be blocked from performing any Sudoku puzzle actions, history, or database edits across the app.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Reason for Suspension (Optional):</label>
              <textarea
                rows={3}
                placeholder="e.g. Violation of custom puzzle generation rules or inappropriate behavior."
                value={banReasonInput}
                onChange={(e) => setBanReasonInput(e.target.value)}
                className="w-full bg-slate-900 text-slate-100 p-3 text-sm rounded-xl border border-slate-700 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedUserForBan(null)}
                className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-700/60 hover:bg-slate-700 rounded-xl"
              >
                Cancel
              </button>

              <button
                onClick={confirmBanUser}
                disabled={updatingUid === selectedUserForBan.uid}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-900/40 transition-all flex items-center gap-2"
              >
                <Ban className="w-4 h-4" />
                Confirm Ban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

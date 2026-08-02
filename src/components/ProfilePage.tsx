import React, { useState } from "react";
import { useAuth } from "../context";
import { useNavigate } from "react-router-dom";
import PuzzleHistoryView from "./PuzzleHistoryView";
import { 
  User as UserIcon, 
  Mail, 
  Edit3, 
  LogOut, 
  Trash2, 
  Check, 
  AlertTriangle, 
  X, 
  Loader2, 
  Shield, 
  Calendar,
  ArrowLeft,
  Crown,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function ProfilePage() {
  const { user, userRole, isOwner, logout, updateDisplayName, deleteAccount, authError, clearAuthError } = useAuth();
  const navigate = useNavigate();

  const [isEditingName, setIsEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(user?.displayName || "");
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-slate-400 mb-4">
          <UserIcon className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Not Logged In</h2>
        <p className="text-sm text-slate-400 mb-6 max-w-md">
          Please sign in to access your profile settings and manage your account.
        </p>
        <button
          onClick={() => navigate("/sudoku")}
          className="inline-flex items-center space-x-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Sudoku Game</span>
        </button>
      </div>
    );
  }

  const handleSaveDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDisplayName.trim()) return;

    setUpdating(true);
    setUpdateSuccess(false);
    try {
      await updateDisplayName(newDisplayName);
      setUpdateSuccess(true);
      setIsEditingName(false);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/sudoku");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      setIsDeleteModalOpen(false);
      navigate("/sudoku");
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete account.");
    } finally {
      setDeleting(false);
    }
  };

  // Format account metadata created date
  const createdDate = user.metadata?.creationTime 
    ? new Date(user.metadata.creationTime).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : "Recently";

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-4">
      
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-indigo-400 transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center space-x-3">
            <span>User Profile & Settings</span>
            <span className="flex items-center space-x-1 rounded-full bg-indigo-950/80 px-2.5 py-0.5 text-xs font-mono text-indigo-300 ring-1 ring-indigo-500/30">
              <Shield className="h-3 w-3 text-indigo-400" />
              <span>AUTHENTICATED</span>
            </span>
          </h1>
        </div>

        <button
          onClick={handleLogout}
          className="inline-flex items-center space-x-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-rose-950/30 hover:border-rose-800/40 hover:text-rose-300 transition-all cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Log Out</span>
        </button>
      </div>

      {/* Auth Error Banner */}
      {authError && (
        <div className="flex items-start space-x-3 rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs text-rose-300">
          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">{authError}</span>
          </div>
          <button onClick={clearAuthError} className="text-rose-400 hover:text-rose-200 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Success Notification */}
      {updateSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-xs text-emerald-300 font-semibold"
        >
          <Check className="h-4 w-4 text-emerald-400" />
          <span>Display name updated successfully!</span>
        </motion.div>
      )}

      {/* Main Profile Info Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-xl space-y-6">
        
        {/* User Identity Header */}
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <div className="relative">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User Avatar"}
                className="h-20 w-20 rounded-2xl object-cover ring-2 ring-indigo-500/40 shadow-lg"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-bold text-white shadow-lg ring-2 ring-indigo-400/40">
                {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-slate-950 ring-2 ring-slate-900" title="Google Authenticated">
              <Check className="h-3.5 w-3.5 stroke-[3]" />
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-1">
            <h2 className="text-xl font-bold text-slate-100 flex items-center justify-center sm:justify-start space-x-2">
              <span>{user.displayName || "Anime Fan"}</span>
            </h2>
            <div className="flex items-center justify-center sm:justify-start space-x-2 text-xs text-slate-400">
              <Mail className="h-3.5 w-3.5 text-indigo-400" />
              <span>{user.email}</span>
            </div>
            <div className="flex items-center justify-center sm:justify-start space-x-2 text-[11px] text-slate-500 font-mono pt-1">
              <Calendar className="h-3 w-3" />
              <span>Member since {createdDate}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-6 space-y-6">
          
          {/* Change Display Name Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                Display Name
              </label>
              {!isEditingName && (
                <button
                  onClick={() => {
                    setNewDisplayName(user.displayName || "");
                    setIsEditingName(true);
                  }}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit Name</span>
                </button>
              )}
            </div>

            {isEditingName ? (
              <form onSubmit={handleSaveDisplayName} className="space-y-3">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="Enter new display name..."
                    className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={updating || !newDisplayName.trim()}
                    className="inline-flex items-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    <span>Save</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  This name will be displayed when you interact with the app.
                </p>
              </form>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 font-medium">
                <span>{user.displayName || "No display name set"}</span>
              </div>
            )}
          </div>

          {/* Account Details Box */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between">
              <span>Account Security & Access</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                userRole === "owner" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                userRole === "admin" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" :
                "bg-blue-500/20 text-blue-300 border border-blue-500/30"
              }`}>
                Role: {userRole}
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs text-slate-300">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">System Role</span>
                <span className="font-bold capitalize text-slate-100 flex items-center gap-1.5">
                  {userRole === "owner" && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                  {userRole === "admin" && <Shield className="w-3.5 h-3.5 text-purple-400" />}
                  {userRole === "user" && <UserIcon className="w-3.5 h-3.5 text-blue-400" />}
                  {userRole}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">Permissions</span>
                <span className="font-semibold text-slate-200">
                  {userRole === "owner" ? "Full Access & User Control" :
                   userRole === "admin" ? "Sudoku + Database Mgmt" :
                   "Sudoku + Profile Only"}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-lg text-xs text-slate-400 border border-slate-800 space-y-1">
              <div className="font-semibold text-slate-300">Role Capabilities:</div>
              {userRole === "user" && (
                <p>• Standard User: Access to Sudoku game modes, custom puzzle creation, history, and profile settings.</p>
              )}
              {userRole === "admin" && (
                <p>• Admin: Standard features + Database Management (Traits, Characters registry, and Anime sources).</p>
              )}
              {userRole === "owner" && (
                <p>• Owner: Full System Administrator with rights to manage users, ban accounts, and assign roles.</p>
              )}
            </div>

            {/* If Owner, show quick button to Admin Area */}
            {isOwner && (
              <button
                onClick={() => navigate("/admin")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Open Owner User Management Panel</span>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>

        </div>

      </div>

      {/* Puzzle History Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-xl">
        <PuzzleHistoryView />
      </div>

      {/* Danger Zone: Delete Account */}
      <div className="rounded-2xl border border-rose-900/30 bg-rose-950/10 p-6 shadow-xl space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-rose-300 flex items-center space-x-2">
              <Trash2 className="h-4 w-4 text-rose-400" />
              <span>Danger Zone</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              Deleting your account will remove your user session. You can sign up again anytime with Google SSO.
            </p>
          </div>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="rounded-xl border border-rose-800/50 bg-rose-950/40 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-900 hover:text-white transition-all cursor-pointer shrink-0"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-rose-800/60 bg-slate-900 p-6 shadow-2xl space-y-5 text-slate-100"
            >
              <div className="flex items-center space-x-3 text-rose-400">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-950/80 ring-1 ring-rose-500/40">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">Delete Your Account?</h3>
                  <p className="text-xs text-rose-300 font-mono">THIS ACTION IS PERMANENT</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to delete your account (<span className="font-semibold text-slate-100">{user.email}</span>)?
              </p>

              {deleteError && (
                <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-950/60 text-xs text-rose-300">
                  {deleteError}
                </div>
              )}

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center space-x-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  <span>Yes, Delete Account</span>
                </button>
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={deleting}
                  className="rounded-xl border border-slate-800 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

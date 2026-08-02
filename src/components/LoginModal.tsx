import { useAuth } from "../context";
import { LogIn, X, AlertCircle, Grid3X3, Database, Sliders } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function LoginModal() {
  const { 
    isLoginModalOpen, 
    closeLoginModal, 
    loginModalReason, 
    loginWithGoogle, 
    authError, 
    clearAuthError 
  } = useAuth();

  if (!isLoginModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl shadow-indigo-950/50 text-slate-100"
        >
          {/* Close button */}
          <button
            onClick={closeLoginModal}
            className="absolute top-4 right-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 ring-1 ring-indigo-500/30 text-indigo-400">
              <LogIn className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-100 tracking-tight">
                Sign in to <span className="text-indigo-400">AnimeRegistry</span>
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                {loginModalReason || "Unlock complete access to character databases, custom traits, and custom puzzle builders."}
              </p>
            </div>
          </div>

          {/* Error notice */}
          {authError && (
            <div className="mb-4 flex items-start space-x-2 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{authError}</span>
              </div>
              <button onClick={clearAuthError} className="text-rose-400 hover:text-rose-200 cursor-pointer">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Feature highlights */}
          <div className="mb-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3 text-xs text-slate-300">
            <div className="flex items-center space-x-2.5">
              <Grid3X3 className="h-4 w-4 text-indigo-400 shrink-0" />
              <span>Create and share custom Anime Sudoku Puzzles</span>
            </div>
            <div className="flex items-center space-x-2.5">
              <Database className="h-4 w-4 text-indigo-400 shrink-0" />
              <span>Explore and register characters in the database</span>
            </div>
            <div className="flex items-center space-x-2.5">
              <Sliders className="h-4 w-4 text-indigo-400 shrink-0" />
              <span>Configure character traits and attributes</span>
            </div>
          </div>

          {/* Google SSO Login Button */}
          <div className="space-y-3">
            <button
              onClick={loginWithGoogle}
              className="w-full flex items-center justify-center space-x-3 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-100 active:bg-slate-200 shadow-lg shadow-white/10 transition-all cursor-pointer"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>

            <button
              onClick={closeLoginModal}
              className="w-full text-center py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              Continue as Guest (Sudoku view only)
            </button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-[10px] text-slate-500 font-mono">
              SECURE GOOGLE SSO AUTHENTICATION
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

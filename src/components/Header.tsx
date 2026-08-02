import { Award, Grid3X3, Sliders, Users, Tv, Shield } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context";

interface HeaderProps {
  dbCount: number;
  traitsCount: number;
  animesCount: number;
}

export default function Header({ dbCount, traitsCount, animesCount }: HeaderProps) {
  const { user, userRole, isAdmin, isOwner, openLoginModal } = useAuth();
  const location = useLocation();
  const path = location.pathname;

  // Helpers to determine active tabs
  const isTraitsActive = path.startsWith("/traits");
  const isDatabaseActive = path.startsWith("/database");
  const isBrowseActive = path.startsWith("/browse") || path.startsWith("/anime");
  const isSudokuActive = path.startsWith("/sudoku");
  const isProfileActive = path.startsWith("/profile");
  const isAdminActive = path.startsWith("/admin");

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/80 shadow-md backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo and App Brand */}
        <Link to={user ? "/database" : "/sudoku"} className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group shrink-0">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-md shadow-indigo-500/20 ring-1 ring-indigo-450/40 transition-transform group-hover:scale-105">
            <Award className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
          </div>
          <div className="hidden xs:block sm:block">
            <h1 className="text-sm sm:text-lg font-extrabold tracking-tight text-slate-100 font-sans">
              Ani<span className="text-indigo-400">Char</span>Doku
            </h1>
            <p className="hidden md:block text-[9px] font-bold tracking-widest text-indigo-400 font-mono">
              Anime Character Sudoku
            </p>
          </div>
        </Link>

        {/* View Tabs */}
        <nav className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto">
          {user ? (
            <>
              {/* Traits Configuration Tab (Admin & Owner Only) */}
              {isAdmin && (
                <Link
                  to="/traits"
                  title="Traits Configuration"
                  className={`group inline-flex items-center space-x-1 sm:space-x-2 rounded-xl px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer shrink-0 ${
                    isTraitsActive
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                      : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                  }`}
                >
                  <Sliders className={`h-4 w-4 sm:h-4.5 sm:w-4.5 transition-transform duration-200 ${
                    isTraitsActive ? "scale-105 text-indigo-200" : "group-hover:scale-105"
                  }`} />
                  <span className="hidden sm:inline">Traits</span>
                  <span
                    className={`ml-0.5 sm:ml-1 flex h-4.5 min-w-4.5 sm:h-5 sm:w-5 items-center justify-center rounded-full px-1 sm:px-1.5 text-[10px] sm:text-[11px] font-bold font-mono transition-colors ${
                      isTraitsActive
                        ? "bg-indigo-800 text-indigo-100"
                        : "bg-slate-850 text-slate-440 group-hover:bg-slate-800 group-hover:text-slate-200"
                    }`}
                  >
                    {traitsCount}
                  </span>
                </Link>
              )}

              {/* Database Tab (Visible to all logged-in users, including User level) */}
              <Link
                to="/database"
                title="Character Database"
                className={`group inline-flex items-center space-x-1 sm:space-x-2 rounded-xl px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer shrink-0 ${
                  isDatabaseActive
                    ? "bg-slate-800 text-slate-100 border border-slate-700 shadow-inner"
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                }`}
              >
                <Users className={`h-4 w-4 sm:h-4.5 sm:w-4.5 transition-transform duration-200 ${
                  isDatabaseActive ? "scale-105 text-indigo-400" : "group-hover:scale-105"
                }`} />
                <span className="hidden sm:inline">Characters</span>
                <span
                  className={`ml-0.5 sm:ml-1 flex h-4.5 min-w-4.5 sm:h-5 sm:w-5 items-center justify-center rounded-full px-1 sm:px-1.5 text-[10px] sm:text-[11px] font-bold font-mono transition-colors ${
                    isDatabaseActive
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-850 text-slate-440 group-hover:bg-slate-800 group-hover:text-slate-200"
                  }`}
                >
                  {dbCount}
                </span>
              </Link>

              {/* Explore Top Anime Tab (Browse) (Admin & Owner Only) */}
              {isAdmin && (
                <Link
                  to="/browse"
                  title="Explore Top Anime"
                  className={`group inline-flex items-center space-x-1 sm:space-x-2 rounded-xl px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer shrink-0 ${
                    isBrowseActive
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                      : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                  }`}
                >
                  <Tv className={`h-4 w-4 sm:h-4.5 sm:w-4.5 transition-transform duration-200 ${
                    isBrowseActive ? "scale-105 text-indigo-200" : "group-hover:scale-105"
                  }`} />
                  <span className="hidden sm:inline">Anime</span>
                  <span
                    className={`ml-0.5 sm:ml-1 flex h-4.5 min-w-4.5 sm:h-5 sm:w-5 items-center justify-center rounded-full px-1 sm:px-1.5 text-[10px] sm:text-[11px] font-bold font-mono transition-colors ${
                      isBrowseActive
                        ? "bg-indigo-800 text-indigo-100"
                        : "bg-slate-850 text-slate-440 group-hover:bg-slate-800 group-hover:text-slate-200"
                    }`}
                  >
                    {animesCount}
                  </span>
                </Link>
              )}

              {/* Admin User Management Tab (Owner Only) */}
              {isOwner && (
                <Link
                  to="/admin"
                  title="Owner User Management"
                  className={`group inline-flex items-center space-x-1.5 rounded-xl px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer shrink-0 border ${
                    isAdminActive
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-lg shadow-amber-500/10"
                      : "text-amber-400/80 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-300"
                  }`}
                >
                  <Shield className="h-4 w-4 text-amber-400" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}
            </>
          ) : null}

          {/* Sudoku Tab (Visible to all) */}
          <Link
            to="/sudoku"
            title="Play Sudoku Grid"
            className={`group inline-flex items-center space-x-1 sm:space-x-2 rounded-xl px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer shrink-0 ${
              isSudokuActive
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
            }`}
          >
            <Grid3X3 className={`h-4 w-4 sm:h-4.5 sm:w-4.5 transition-transform duration-200 ${
              isSudokuActive ? "scale-105 text-indigo-200" : "group-hover:scale-105"
            }`} />
            <span className="hidden sm:inline">Sudoku</span>
          </Link>

          {/* User Auth Section */}
          {user ? (
            <Link
              to="/profile"
              title="User Profile & Settings"
              className={`group flex items-center space-x-2 rounded-xl p-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer shrink-0 border ${
                isProfileActive
                  ? "bg-indigo-950/80 border-indigo-500/50 text-indigo-200 ring-1 ring-indigo-500/30"
                  : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="h-6 w-6 rounded-lg object-cover ring-1 ring-indigo-400/30 shrink-0"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-[10px] font-bold text-white shrink-0">
                  {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                </div>
              )}
              <span className="hidden md:inline max-w-[100px] truncate font-medium">
                {user.displayName || user.email?.split("@")[0] || "Profile"}
              </span>

              {/* Role badge indicator */}
              <span className={`hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                userRole === "owner" 
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" 
                  : userRole === "admin" 
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" 
                  : "bg-slate-700 text-slate-300"
              }`}>
                {userRole}
              </span>
            </Link>
          ) : (
            <button
              onClick={() => openLoginModal("Log in with Google to unlock full access to character registry, custom traits, and custom puzzle creation.")}
              className="inline-flex items-center space-x-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-extrabold text-slate-900 shadow-md shadow-white/10 hover:bg-slate-100 transition-all cursor-pointer shrink-0"
            >
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24">
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
              <span>Sign In</span>
            </button>
          )}

        </nav>

      </div>
    </header>
  );
}

import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context";
import { RegisteredCharacter } from "@shared/types/index";
import { Ban } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AdminProtectedRoute, BrowsePageRedirect, OwnerProtectedRoute, ProtectedRoute } from "./components/Router";
import { AdminUsersView, AnimeGrid, CharacterGrid, DatabaseView, Header, LoginModal, ProfilePage, RegisterForm, SudokuGame, TraitsConfigView } from "./components";
import { TraitsPage } from "./pages";
import { AppProvider, useApp } from "./context/AppContext";

function AppContent() {
  const [dbCharacters, setDbCharacters] = useState<RegisteredCharacter[]>([]);
  const [dbAnimes, setDbAnimes] = useState<any[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [firebaseStatus, setFirebaseStatus] = useState<{ isConfigured: boolean; usingFallback: boolean; error?: string } | null>(null);
  const { traitsCount, updateTraitsCount } = useApp();

  const { user, isBanned } = useAuth();
  const navigate = useNavigate();

  // Load database on launch
  const fetchDatabase = async () => {
    setDbLoading(true);
    try {
      const statusRes = await fetch("/api/firebase-status");
      if (statusRes.ok) {
        const stats = await statusRes.json();
        setFirebaseStatus(stats);
      }

      const response = await fetch("/api/database");
      if (response.ok) {
        const data = await response.json();
        setDbCharacters(data);
      }

      const animesRes = await fetch("/api/database/animes");
      if (animesRes.ok) {
        const data = await animesRes.json();
        setDbAnimes(data);
      }

      // Fetch traits count
      const traitsRes = await fetch("/api/traits/count");
      if (traitsRes.ok) {
        const traitsData = await traitsRes.json();
        updateTraitsCount(traitsData.count);
      }
    } catch (err) {
      console.error("Failed to load local db:", err);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabase();
  }, []);

  // Delete handler
  const handleDeleteCharacter = async (id: string) => {
    try {
      const response = await fetch(`/api/database/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        // Refresh local cache
        fetchDatabase();
      } else {
        console.error("Failed to remove character record.");
      }
    } catch (err) {
      console.error("Failed deleting character:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-600/30 selection:text-indigo-200">

      {/* Login Modal */}
      <LoginModal />

      {/* Banned User Alert Banner */}
      {user && isBanned && (
        <div className="bg-rose-950 border-b border-rose-800 text-rose-200 px-4 py-3 shadow-lg flex items-center justify-center gap-2 text-xs md:text-sm font-semibold sticky top-16 z-30">
          <Ban className="w-5 h-5 text-rose-400 shrink-0" />
          <span>ACCOUNT SUSPENDED: Your account has been banned by an owner. Interactive actions & database edits are restricted.</span>
        </div>
      )}

      {/* Premium Header */}
      <Header
        dbCount={dbCharacters.length}
        traitsCount={traitsCount}
        animesCount={dbAnimes.length}
      />

      {/* Main Container viewport */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        <AnimatePresence mode="wait">
          <Routes>

            {/* Database Views (Accessible to all logged-in users) */}
            <Route
              path="/database"
              element={
                <ProtectedRoute>
                  <motion.div
                    key="database-view"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <DatabaseView
                      characters={dbCharacters}
                      loading={dbLoading}
                      firebaseStatus={firebaseStatus}
                      onDeleteCharacter={handleDeleteCharacter}
                      onRefresh={fetchDatabase}
                      onNavigateToAnime={() => navigate("/browse")}
                    />
                  </motion.div>
                </ProtectedRoute>
              }
            />

            <Route
              path="/database/edit/:charId"
              element={
                <AdminProtectedRoute>
                  <motion.div
                    key="edit-form-view"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <RegisterForm
                      isEdit={true}
                      onBack={(page) => {
                        navigate(page ? `/database?page=${page}` : "/database");
                      }}
                      onRegisterSuccess={(stayInBrowse, page) => {
                        fetchDatabase();
                        if (!stayInBrowse) {
                          navigate(page ? `/database?page=${page}` : "/database");
                        }
                      }}
                    />
                  </motion.div>
                </AdminProtectedRoute>
              }
            />

            {/* Browse / Anime List views (Admin & Owner Protected) */}
            <Route
              path="/browse"
              element={
                <AdminProtectedRoute>
                  <motion.div
                    key="anime-list-view"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AnimeGrid
                      dbCharacters={dbCharacters}
                      dbAnimes={dbAnimes}
                    />
                  </motion.div>
                </AdminProtectedRoute>
              }
            />

            <Route
              path="/browse/page/:page"
              element={
                <AdminProtectedRoute>
                  <BrowsePageRedirect />
                </AdminProtectedRoute>
              }
            />

            <Route
              path="/anime/:animeId"
              element={
                <AdminProtectedRoute>
                  <motion.div
                    key="characters-view"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CharacterGrid
                      dbCharacters={dbCharacters}
                      dbAnimes={dbAnimes}
                      onRefresh={fetchDatabase}
                    />
                  </motion.div>
                </AdminProtectedRoute>
              }
            />

            <Route
              path="/browse/register/:animeId/:charId"
              element={
                <AdminProtectedRoute>
                  <motion.div
                    key="register-form-view"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <RegisterForm
                      onBack={() => {
                        if (window.history.length > 2) {
                          navigate(-1);
                        } else {
                          navigate("/browse");
                        }
                      }}
                      onRegisterSuccess={(stayInBrowse) => {
                        fetchDatabase();
                        if (!stayInBrowse) {
                          navigate("/database");
                        }
                      }}
                    />
                  </motion.div>
                </AdminProtectedRoute>
              }
            />

            {/* Traits Config view (Admin & Owner Protected) */}
            <Route
              path="/traits"
              element={
                <AdminProtectedRoute>
                  <motion.div
                    key="traits-config-view"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TraitsPage />
                  </motion.div>
                </AdminProtectedRoute>
              }
            />

            {/* Owner User Management Area (Owner Only) */}
            <Route
              path="/admin"
              element={
                <OwnerProtectedRoute>
                  <motion.div
                    key="admin-users-view"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AdminUsersView />
                  </motion.div>
                </OwnerProtectedRoute>
              }
            />

            {/* Profile Page (Protected) */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <motion.div
                    key="profile-view"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ProfilePage />
                  </motion.div>
                </ProtectedRoute>
              }
            />

            {/* Sudoku Game view (Public for all users) */}
            <Route
              path="/sudoku"
              element={
                <motion.div
                  key="sudoku-view"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <SudokuGame
                    characters={dbCharacters}
                    animes={dbAnimes}
                    onRefreshCharacters={fetchDatabase}
                    onNavigateToBrowse={() => navigate("/browse")}
                  />
                </motion.div>
              }
            />

            <Route
              path="/sudoku/daily"
              element={
                <motion.div
                  key="sudoku-view-daily"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <SudokuGame
                    characters={dbCharacters}
                    animes={dbAnimes}
                    onRefreshCharacters={fetchDatabase}
                    onNavigateToBrowse={() => navigate("/browse")}
                  />
                </motion.div>
              }
            />

            <Route
              path="/sudoku/daily/:dateParam"
              element={
                <motion.div
                  key="sudoku-view-daily-date"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <SudokuGame
                    characters={dbCharacters}
                    animes={dbAnimes}
                    onRefreshCharacters={fetchDatabase}
                    onNavigateToBrowse={() => navigate("/browse")}
                  />
                </motion.div>
              }
            />

            <Route
              path="/sudoku/:code"
              element={
                <motion.div
                  key="sudoku-view-custom"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <SudokuGame
                    characters={dbCharacters}
                    animes={dbAnimes}
                    onRefreshCharacters={fetchDatabase}
                    onNavigateToBrowse={() => navigate("/browse")}
                  />
                </motion.div>
              }
            />

            {/* Default Route Fallback */}
            <Route path="*" element={<Navigate to={user ? "/database" : "/sudoku"} replace />} />

          </Routes>
        </AnimatePresence>

      </main>

      {/* Subtle outer system signature */}
      <footer className="mx-auto max-w-7xl border-t border-slate-900 py-6 text-center text-[11px] font-bold text-slate-550 font-mono tracking-wider">
        &copy; 2026 ANIME CHARACTER SUDOKU - MADE WITH ❤️ BY KIMERASOLAR
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

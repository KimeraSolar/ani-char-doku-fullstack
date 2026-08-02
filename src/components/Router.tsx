import { Loader2 } from "lucide-react";
import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "../context/index";

export function BrowsePageRedirect() {
  const { page } = useParams();
  return <Navigate to={`/browse?page=${page}`} replace />;
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mb-2" />
        <p className="text-xs font-mono">Verifying authentication...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/sudoku" replace />;
  }

  return <>{children}</>;
}

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mb-2" />
        <p className="text-xs font-mono">Verifying permissions...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/sudoku" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/sudoku" replace />;
  }

  return <>{children}</>;
}

export function OwnerProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isOwner, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400 mb-2" />
        <p className="text-xs font-mono">Verifying owner access...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/sudoku" replace />;
  }

  if (!isOwner) {
    return <Navigate to="/sudoku" replace />;
  }

  return <>{children}</>;
}

export default function Router() {
  return (
    {
      AdminProtectedRoute,
      BrowsePageRedirect,
      OwnerProtectedRoute,
      ProtectedRoute,
    }
  )}
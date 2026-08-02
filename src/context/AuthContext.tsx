import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  updateProfile, 
  deleteUser as firebaseDeleteUser, 
  onAuthStateChanged, 
  User,
  Auth
} from "firebase/auth";
import { UserProfile, UserRole } from "@shared/types/index";

const getFirebaseConfig = () => {
  const env = (import.meta as any).env || {};
  return {
    apiKey: env.VITE_FIREBASE_API_KEY || "",
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: env.VITE_FIREBASE_APP_ID || "",
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || "",
  };
};

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  userRole: UserRole;
  isAdmin: boolean;
  isOwner: boolean;
  isBanned: boolean;
  loading: boolean;
  authError: string | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateDisplayName: (newName: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  clearAuthError: () => void;
  isLoginModalOpen: boolean;
  openLoginModal: (reason?: string) => void;
  closeLoginModal: () => void;
  loginModalReason: string | null;
  refreshUserProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

let clientAuth: Auth | null = null;

function getClientAuth(): Auth | null {
  if (clientAuth) return clientAuth;
  try {
    let app;
    if (getApps().length === 0) {
      app = initializeApp(getFirebaseConfig());
    } else {
      app = getApp();
    }
    clientAuth = getAuth(app);
    return clientAuth;
  } catch (err) {
    console.error("Failed to initialize Firebase Auth client:", err);
    return null;
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [loginModalReason, setLoginModalReason] = useState<string | null>(null);

  const syncBackendUser = useCallback(async (firebaseUser: User): Promise<UserProfile | null> => {
    try {
      const res = await fetch("/api/users/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          displayName: firebaseUser.displayName || "",
          photoURL: firebaseUser.photoURL || "",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.userProfile) {
          setUserProfile(data.userProfile);
          return data.userProfile;
        }
      }
    } catch (err) {
      console.error("Failed to sync backend user record:", err);
    }
    return null;
  }, []);

  const refreshUserProfile = useCallback(async (): Promise<UserProfile | null> => {
    if (!user) return null;
    return await syncBackendUser(user);
  }, [user, syncBackendUser]);

  useEffect(() => {
    const auth = getClientAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await syncBackendUser(currentUser);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [syncBackendUser]);

  const openLoginModal = (reason?: string) => {
    setLoginModalReason(reason || null);
    setIsLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
    setLoginModalReason(null);
  };

  const clearAuthError = () => setAuthError(null);

  const loginWithGoogle = async () => {
    setAuthError(null);
    const auth = getClientAuth();
    if (!auth) {
      setAuthError("Firebase Auth is not properly initialized.");
      return;
    }

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        await syncBackendUser(result.user);
      }
      closeLoginModal();
    } catch (err: any) {
      console.error("Google sign in error:", err);
      if (err.code === "auth/popup-closed-by-user") {
        return;
      }
      setAuthError(err.message || "Failed to sign in with Google.");
    }
  };

  const logout = async () => {
    setAuthError(null);
    const auth = getClientAuth();
    if (!auth) return;
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (err: any) {
      console.error("Sign out error:", err);
      setAuthError("Failed to log out.");
    }
  };

  const updateDisplayName = async (newName: string) => {
    setAuthError(null);
    const auth = getClientAuth();
    const currentUser = auth?.currentUser;
    if (!currentUser) {
      throw new Error("No user is currently logged in.");
    }

    const trimmed = newName.trim();
    if (!trimmed) {
      throw new Error("Display name cannot be empty.");
    }

    try {
      await updateProfile(currentUser, { displayName: trimmed });
      const updatedUser = { ...currentUser, displayName: trimmed } as User;
      setUser(updatedUser);
      await syncBackendUser(updatedUser);
    } catch (err: any) {
      console.error("Update profile error:", err);
      setAuthError(err.message || "Failed to update display name.");
      throw err;
    }
  };

  const deleteAccount = async () => {
    setAuthError(null);
    const auth = getClientAuth();
    const currentUser = auth?.currentUser;
    if (!currentUser) {
      throw new Error("No user is currently logged in.");
    }

    try {
      await firebaseDeleteUser(currentUser);
      setUser(null);
      setUserProfile(null);
    } catch (err: any) {
      console.error("Delete user error:", err);
      if (err.code === "auth/requires-recent-login") {
        setAuthError("For security reasons, deleting your account requires a recent login. Please log out and log in again, then retry.");
        throw new Error("Please re-authenticate by logging in again before deleting your account.");
      }
      setAuthError(err.message || "Failed to delete account.");
      throw err;
    }
  };

  const userRole: UserRole = userProfile?.role || "user";
  const isAdmin = userRole === "admin" || userRole === "owner";
  const isOwner = userRole === "owner";
  const isBanned = !!userProfile?.isBanned;

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        userRole,
        isAdmin,
        isOwner,
        isBanned,
        loading,
        authError,
        loginWithGoogle,
        logout,
        updateDisplayName,
        deleteAccount,
        clearAuthError,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        loginModalReason,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

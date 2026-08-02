import { UserProfile, UserRole } from "@shared/types/index.js";
import { getFirestoreDb } from "./firebase.model.js";

export async function fetchAllUsers(): Promise<UserProfile[]> {
  const db = getFirestoreDb();
  let usersList: UserProfile[] = [];

  if (db) {
    try {
      const snapshot = await db.collection("users").get();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as UserProfile;
        if (data && data.uid) {
          usersList.push(data);
        }
      });
    } catch (err) {
      console.error("Failed to fetch users from Firestore:", err);
    }
  }

  const map = new Map<string, UserProfile>();
  usersList.forEach((u) => map.set(u.uid, u));

  const result = Array.from(map.values());
  result.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
  return result;
}

export async function syncUserRecord(input: {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}): Promise<UserProfile> {
  const allUsers = await fetchAllUsers();
  const existingIndex = allUsers.findIndex((u) => u.uid === input.uid);

  const now = new Date().toISOString();
  let profile: UserProfile;

  if (existingIndex !== -1) {
    const existing = allUsers[existingIndex];
    profile = {
      ...existing,
      email: input.email || existing.email,
      displayName: input.displayName || existing.displayName || input.email.split("@")[0] || "User",
      photoURL: input.photoURL !== undefined ? input.photoURL : existing.photoURL,
      lastLoginAt: now,
    };
  } else {
    // If this is the FIRST user ever registered in the system, automatically grant owner role!
    const role: UserRole = allUsers.length === 0 ? "owner" : "user";
    profile = {
      uid: input.uid,
      email: input.email,
      displayName: input.displayName || input.email.split("@")[0] || "User",
      photoURL: input.photoURL || "",
      role,
      isBanned: false,
      banReason: "",
      createdAt: now,
      lastLoginAt: now,
    };
  }

  // Save to Firestore
  const db = getFirestoreDb();
  if (db) {
    try {
      const userRef = db.collection("users").doc(profile.uid);
      await userRef.set(profile, { merge: true });
    } catch (err) {
      console.error("Failed to save user record to Firestore:", err);
    }
  }

  return profile;
}

export async function updateUserRole(uid: string, newRole: UserRole): Promise<UserProfile> {
  const allUsers = await fetchAllUsers();
  const target = allUsers.find((u) => u.uid === uid);
  if (!target) {
    throw new Error(`User with UID ${uid} not found.`);
  }

  target.role = newRole;

  const db = getFirestoreDb();
  if (db) {
    try {
      const userRef = db.collection("users").doc(uid);
      await userRef.set({ role: newRole }, { merge: true });
    } catch (err) {
      console.error("Failed to update user role in Firestore:", err);
    }
  }

  return target;
}

export async function updateUserBanStatus(
  uid: string,
  isBanned: boolean,
  banReason?: string
): Promise<UserProfile> {
  const allUsers = await fetchAllUsers();
  const target = allUsers.find((u) => u.uid === uid);
  if (!target) {
    throw new Error(`User with UID ${uid} not found.`);
  }

  target.isBanned = isBanned;
  target.banReason = banReason || "";

  const db = getFirestoreDb();
  if (db) {
    try {
      const userRef = db.collection("users").doc(uid);
      await userRef.set({ isBanned, banReason: banReason || "" }, { merge: true });
    } catch (err) {
      console.error("Failed to update user ban status in Firestore:", err);
    }
  }

  return target;
}
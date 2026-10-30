import { UserProfile, UserRole } from "@shared/types/index.js";
import { getDb } from "./mongo.model.js";

export async function fetchAllUsers(): Promise<UserProfile[]> {
  const db = await getDb();
  let usersList: UserProfile[] = [];

  if (db) {
    try {
      const docs = await db.collection("users").find({}).toArray();
      docs.forEach((doc: any) => {
        const { _id, ...rest } = doc;
        if (rest && rest.uid) {
          usersList.push(rest as UserProfile);
        }
      });
    } catch (err) {
      console.error("Failed to fetch users from MongoDB:", err);
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

  // Save to MongoDB
  const db = await getDb();
  if (db) {
    try {
      await db.collection("users").updateOne({ _id: profile.uid as any }, { $set: profile }, { upsert: true });
    } catch (err) {
      console.error("Failed to save user record to MongoDB:", err);
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

  const db = await getDb();
  if (db) {
    try {
      await db.collection("users").updateOne({ _id: uid as any }, { $set: { role: newRole } }, { upsert: true });
    } catch (err) {
      console.error("Failed to update user role in MongoDB:", err);
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

  const db = await getDb();
  if (db) {
    try {
      await db.collection("users").updateOne({ _id: uid as any }, { $set: { isBanned, banReason: banReason || "" } }, { upsert: true });
    } catch (err) {
      console.error("Failed to update user ban status in MongoDB:", err);
    }
  }

  return target;
}
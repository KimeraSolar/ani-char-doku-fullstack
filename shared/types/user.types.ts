export type UserRole = "user" | "admin" | "owner";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  isBanned: boolean;
  banReason?: string;
  createdAt: string;
  lastLoginAt: string;
}
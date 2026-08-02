
import { getApps, initializeApp } from "firebase-admin/app";
import { Firestore, getFirestore } from "firebase-admin/firestore";
import { db } from "./config.model";

let appInstance: ReturnType<typeof initializeApp> | null = null;
let dbInstance: Firestore | null = null;
let triedInitialization = false;

export interface FirebaseStatus {
  isConfigured: boolean;
  usingFallback: boolean;
  error?: string;
}

export function getFirebaseStatus(): FirebaseStatus {
  const hasConfig = !!(
    process.env.FIRESTORE_PROJECT_ID &&
    process.env.FIRESTORE_API_KEY
  );

  if (!hasConfig) {
    return {
      isConfigured: false,
      usingFallback: true,
    };
  }

  try {
    return {
      isConfigured: !!db,
      usingFallback: !db,
    };
  } catch (err: any) {
    return {
      isConfigured: false,
      usingFallback: true,
      error: err.message,
    };
  }
}

export function getFirestoreDb(): Firestore | null {
  if (dbInstance) return dbInstance;
  if (triedInitialization && !appInstance) return null;

  triedInitialization = true;

  const apiKey = process.env.FIRESTORE_API_KEY;
  const authDomain = process.env.FIRESTORE_AUTH_DOMAIN;
  const projectId = process.env.FIRESTORE_PROJECT_ID;
  const storageBucket = process.env.FIRESTORE_STORAGE_BUCKET;
  const messagingSenderId = process.env.FIRESTORE_MESSAGING_SENDER_ID;
  const appId = process.env.FIRESTORE_APP_ID;
  const measurementId = process.env.FIRESTORE_MEASUREMENT_ID;
  const firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID;

  if (!projectId || !apiKey) {
    console.warn("⚠️ Firebase environment variables are not fully configured.");
    return null;
  }

  const firebaseConfig = {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    measurementId
  };

  try {
    if (getApps().length === 0) {
      appInstance = initializeApp(firebaseConfig);
    } else {
      appInstance = getApps()[0];
    }

    if (firestoreDatabaseId) {
      dbInstance = getFirestore(appInstance, firestoreDatabaseId);
    } else {
      dbInstance = getFirestore(appInstance);
    }
    console.log(`⚡ Successfully initialized Cloud Firestore database "${firestoreDatabaseId || "(default)"}" with live connection.`);

    return dbInstance;
  } catch (err) {
    console.error("❌ Failed to initialize Firebase SDK:", err);
    return null;
  }
}
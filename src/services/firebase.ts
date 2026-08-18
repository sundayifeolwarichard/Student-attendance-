import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, getFirestore, Firestore, setLogLevel } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import config from "../../firebase-applet-config.json";

let app;
try {
  app = getApps().length === 0 ? initializeApp(config) : getApp();
} catch (e) {
  console.warn("Firebase App initialization notice:", e);
  app = getApps()[0];
}

// Suppress verbose internal Firestore logs/warnings in the console
try {
  setLogLevel('silent');
} catch (e) {
  // Ignore
}

let firestoreDb: Firestore;
try {
  const dbId = config.firestoreDatabaseId || "ai-studio-polytechnicibada-c70e210f-dee2-4f70-9614-2dc114764c6d";
  // Use initializeFirestore with experimentalForceLongPolling to prevent iframe proxy/stream disconnects
  // In the Web SDK, databaseId is passed as the third parameter
  firestoreDb = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, dbId);
} catch (e) {
  console.warn("Firestore custom initialize failed, trying default with long polling:", e);
  try {
    firestoreDb = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch (err) {
    console.warn("Firestore final fallback:", err);
    // If it is already initialized, get the existing instance
    firestoreDb = getFirestore(app);
  }
}

let firebaseAuth: Auth;
try {
  firebaseAuth = getAuth(app);
} catch (e) {
  console.warn("Auth initialization notice:", e);
}

export const db = firestoreDb;
export const auth = firebaseAuth!;

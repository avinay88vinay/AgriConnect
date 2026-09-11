// Firebase App
import { initializeApp } from "firebase/app";

// Firebase Authentication
import { getAuth } from "firebase/auth";

// Firebase Firestore
import { getFirestore } from "firebase/firestore";

// Firebase Storage
import { getStorage } from "firebase/storage";

// =========================================
// FIREBASE CONFIGURATION
// =========================================

const firebaseConfig = {
  apiKey: "AIzaSyB6ybMb5jvD1mG0PA3M9VLX8TvzU0cc1wY",
  authDomain: "agriconnect-avsmn.firebaseapp.com",
  projectId: "agriconnect-avsmn",
  storageBucket: "agriconnect-avsmn.firebasestorage.app",
  messagingSenderId: "191093154748",
  appId: "1:191093154748:web:8dd5b5d899b9563194c1b9",
};

// =========================================
// INITIALIZE FIREBASE
// =========================================

const app = initializeApp(firebaseConfig);

// =========================================
// FIREBASE AUTH
// =========================================

export const auth = getAuth(app);

// =========================================
// FIREBASE FIRESTORE DATABASE
// =========================================

export const db = getFirestore(app);

// =========================================
// FIREBASE STORAGE
// =========================================

export const storage = getStorage(app);

// =========================================
// DEFAULT EXPORT
// =========================================

export default app;
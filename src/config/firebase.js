import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

let app = null;
let firestore = null;

try {
  if (import.meta.env.VITE_FIREBASE_API_KEY) {
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };

    app = initializeApp(firebaseConfig);
    firestore = getFirestore(app);
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
}

export { app, firestore };

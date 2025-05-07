// src/lib/firebase.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, AuthErrorCodes } from 'firebase/auth'; // Keep Auth imports

// --- IMPORTANT ---
// Firebase configuration is still needed for Authentication.
// Ensure you have a .env.local file with the necessary Firebase config keys.
// Example .env.local:
// NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
// NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
// NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
// NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
// NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
// NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
// --- --- --- --- ---

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, // Still potentially useful for image uploads
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let firebaseApp: FirebaseApp | null = null;
let auth: Auth | null = null;

// Detailed check for each required key
const requiredKeys: (keyof typeof firebaseConfig)[] = [
    'apiKey', 'authDomain', 'projectId', 'appId'
];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);

if (missingKeys.length > 0) {
    console.error(
        `CRITICAL ERROR: Firebase configuration for Authentication is incomplete. Missing keys: ${missingKeys.join(', ')}.`
    );
    console.error("Please ensure these environment variables are set in your .env.local file:");
    missingKeys.forEach(key => {
        const envVarName = `NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
        console.error(`- ${envVarName}`);
    });
} else {
    try {
        // Check if Firebase App is already initialized
        if (!getApps().length) {
            firebaseApp = initializeApp(firebaseConfig);
            console.log("Firebase App initialized successfully (for Auth).");
        } else {
            firebaseApp = getApps()[0];
            console.log("Firebase App already initialized (for Auth).");
        }

        // Initialize Auth only if firebaseApp was initialized successfully
        if (firebaseApp) {
            auth = getAuth(firebaseApp);
            console.log("Firebase Auth initialized successfully.");
        }

    } catch (error: any) {
        console.error("Firebase App/Auth initialization error:", error);
        // Provide more specific error feedback
        if (error.code === 'auth/invalid-api-key' || error.message?.includes('api-key')) {
            console.error(
                "Firebase Auth Error: Invalid API Key. Please verify NEXT_PUBLIC_FIREBASE_API_KEY in your .env.local file."
            );
        } else if (error.code === 'auth/invalid-project-id') {
             console.error(
                "Firebase Auth Error: Invalid Project ID. Please verify NEXT_PUBLIC_FIREBASE_PROJECT_ID."
            );
        } else {
            console.error(`Firebase initialization failed with code: ${error.code}. Message: ${error.message}`);
        }
        firebaseApp = null;
        auth = null; // Ensure auth is null if initialization fails
    }
}

if (!auth) {
     console.warn("Firebase Auth service is unavailable due to initialization issues.");
}

// Export only Auth and the App instance.
// Database operations will now use the SQLite connection from db.ts.
export { auth, firebaseApp };

    